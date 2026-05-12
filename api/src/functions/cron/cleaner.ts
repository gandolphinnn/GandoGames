import { InnerTimeFunction, PlayFabAdmin, PlayFabServer, PlayfabCtx, pfPromise, registerTimeFunction } from '../../';

const DAYS = 1;

const cleanerRoomsInner: InnerTimeFunction = async (_timer, notifier) => {
	const rooms = await PlayfabCtx.rooms.list();
	const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
	const inactiveRooms = rooms.filter(r => r.lastUpdate < twentyMinutesAgo);
	if (!inactiveRooms.length) return;

	for (const room of inactiveRooms) {
		await PlayfabCtx.rooms.delete(room.id);
		await PlayfabCtx.game[room.game].delete(room.id);
		notifier.roomDeleted(room.id);
	}
};

const GUEST_REGISTRY_KEY = 'guest_player_ids';

const cleanerPlayersInner: InnerTimeFunction = async (_timer, _context) => {
	const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

	const registryData = await pfPromise<PlayFabServerModels.GetTitleDataResult>(
		cb => PlayFabServer.GetTitleInternalData({ Keys: [GUEST_REGISTRY_KEY] }, cb),
	);
	const guestIds: string[] = JSON.parse(registryData.Data?.[GUEST_REGISTRY_KEY] ?? '[]');
	if (!guestIds.length) return;

	const toKeep: string[] = [];
	for (const playFabId of guestIds) {
		let userInfo: PlayFabAdminModels.UserAccountInfo | undefined;
		try {
			const result = await pfPromise<PlayFabAdminModels.LookupUserAccountInfoResult>(
				cb => PlayFabAdmin.GetUserAccountInfo({ PlayFabId: playFabId }, cb),
			);
			userInfo = result.UserInfo;
		} catch {
			continue; // already deleted — drop from registry
		}
		if (userInfo?.Username) continue; // converted to registered account — drop from registry, don't delete
		const lastLogin = userInfo?.TitleInfo?.LastLogin;
		if (!lastLogin || new Date(lastLogin) >= cutoff) {
			toKeep.push(playFabId);
			continue;
		}
		console.warn(`Deleting guest player ${playFabId} (last login ${lastLogin})`);
		await pfPromise<PlayFabAdminModels.DeletePlayerResult>(
			cb => PlayFabAdmin.DeletePlayer({ PlayFabId: playFabId }, cb),
		);
	}

	await pfPromise<PlayFabServerModels.SetTitleDataResult>(
		cb => PlayFabServer.SetTitleInternalData({ Key: GUEST_REGISTRY_KEY, Value: JSON.stringify(toKeep) }, cb),
	);
};

registerTimeFunction('cleaner_rooms', '0 */20 * * * *', false, cleanerRoomsInner);
registerTimeFunction('cleaner_players', '0 0 3 * * *', true, cleanerPlayersInner);