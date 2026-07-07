// The (heavy) Azure SDK is loaded lazily inside openContainer() — via a dynamic import() — so it
// is never required under MOCK_BACKEND. The container type is inferred from that runtime import
// rather than statically imported, which would otherwise clash with the SDK's dual ESM/CJS
// declarations under node16.

// Per-room serialization for read-modify-write handlers (game actions, room joins, …).
// The handlers do load → mutate → save against PlayFab, which has no compare-and-set, so two
// concurrent calls on the same room can clobber each other (the second save wins). Wrapping the
// critical section in a per-room lock makes those calls run one at a time.
//
// Backed by an Azure Blob lease — a real distributed lock that works across Function instances,
// using the storage account the Function app already has (AzureWebJobsStorage). When that account
// isn't available (MOCK_BACKEND, or local dev with no storage configured) an in-process async mutex
// is used instead — correct for the single instance those scenarios run on. Production always has
// AzureWebJobsStorage, so it always gets the real cross-instance lock.

const USE_MOCK_BACKEND = process.env['MOCK_BACKEND'] === 'true';
const USE_BLOB_LOCK = !USE_MOCK_BACKEND && !!process.env['AzureWebJobsStorage'];

const LOCK_CONTAINER = 'room-locks';
const LEASE_SECONDS = 15;            // min allowed; auto-expires if a handler crashes mid-section
const RENEW_MS = 10_000;             // renew before the lease lapses so a long handler keeps the lock
const ACQUIRE_TIMEOUT_MS = 10_000;   // how long a waiting call retries before giving up
const RETRY_MS = 100;

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// ── In-process mutex (MOCK_BACKEND) ──────────────────────────────────────────────

const heldKeys = new Map<string, Promise<void>>();

// Exported for unit testing; production goes through withRoomLock.
export async function withInProcessLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	while (heldKeys.has(key)) await heldKeys.get(key);
	let release!: () => void;
	heldKeys.set(key, new Promise<void>(resolve => { release = resolve; }));
	try {
		return await fn();
	} finally {
		heldKeys.delete(key);
		release();
	}
}

// ── Azure Blob lease (production) ─────────────────────────────────────────────────

async function openContainer() {
	const { BlobServiceClient } = await import('@azure/storage-blob');
	const service = BlobServiceClient.fromConnectionString(process.env['AzureWebJobsStorage']!);
	const container = service.getContainerClient(LOCK_CONTAINER);
	await container.createIfNotExists();
	return container;
}

let containerPromise: ReturnType<typeof openContainer> | undefined;
const ensuredBlobs = new Set<string>();

function getContainer(): ReturnType<typeof openContainer> {
	// Assigned synchronously (no await before the assignment) so concurrent callers share one
	// init instead of each creating its own container client.
	if (!containerPromise) containerPromise = openContainer();
	return containerPromise;
}

async function withBlobLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
	const container = await getContainer();
	const blobName = `${roomId}.lock`;
	const blob = container.getBlockBlobClient(blobName);

	// The blob must exist before it can be leased; create an empty one once per room.
	if (!ensuredBlobs.has(blobName)) {
		try {
			await blob.uploadData(Buffer.alloc(0), { conditions: { ifNoneMatch: '*' } });
		} catch (err) {
			const status = (err as { statusCode?: number }).statusCode;
			if (status !== 409 && status !== 412) throw err; // already exists → fine
		}
		ensuredBlobs.add(blobName);
	}

	const lease = blob.getBlobLeaseClient();
	const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
	for (;;) {
		try {
			await lease.acquireLease(LEASE_SECONDS);
			break;
		} catch (err) {
			const status = (err as { statusCode?: number }).statusCode;
			if (status === 409 && Date.now() < deadline) { // held by another action — wait and retry
				await delay(RETRY_MS);
				continue;
			}
			throw err;
		}
	}

	// A handler may outlast the 15s lease; renew periodically so the lock can't be stolen mid-section.
	const renewTimer = setInterval(() => {
		void lease.renewLease().catch(() => { /* lease lost — releaseLease below will no-op */ });
	}, RENEW_MS);
	renewTimer.unref?.(); // don't let the renew timer keep the Function host alive

	try {
		return await fn();
	} finally {
		clearInterval(renewTimer);
		try { await lease.releaseLease(); } catch { /* lease may have already expired */ }
	}
}

if (!USE_MOCK_BACKEND && !USE_BLOB_LOCK) {
	console.warn('[lock] AzureWebJobsStorage is not set — using an in-process room lock. Safe for a '
		+ 'single instance, but it does NOT serialize across scaled-out instances.');
}

/** Run `fn` while holding an exclusive lock for `roomId`. Serializes per-room read-modify-write. */
export const withRoomLock: <T>(roomId: string, fn: () => Promise<T>) => Promise<T> =
	USE_BLOB_LOCK ? withBlobLock : withInProcessLock;
