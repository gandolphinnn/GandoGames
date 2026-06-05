/* const PRESENCE_TTL_MS = 24 * 60 * 60 * 1000; // failsafe; upstream disconnect removes entries immediately

const presence = new Map<string, { name: string; ts: number }>();

function prune(now: number): void {
	for (const [id, e] of presence) {
		if (now - e.ts > PRESENCE_TTL_MS) presence.delete(id);
	}
}

function names(): string[] {
	return Array.from(presence.values()).map(e => e.name);
}

export function upsertPresence(userId: string, name: string): string[] {
	const now = Date.now();
	presence.set(userId, { name, ts: now });
	prune(now);
	return names();
}

export function deletePresence(userId: string): string[] {
	presence.delete(userId);
	prune(Date.now());
	return names();
}

export function getPresenceIdByName(name: string): string | undefined {
	for (const [id, entry] of presence) {
		if (entry.name === name) return id;
	}
	return undefined;
}
 */