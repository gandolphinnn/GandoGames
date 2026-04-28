import { InnerFunctionNotifier, InnerTimeFunction, PlayfabCtx, registerTimeFunction } from '../../';

const cleanerRoomsInner: InnerTimeFunction = async (_timer, _context) => {
	const rooms = await PlayfabCtx.rooms.list();
	const inactiveRooms = rooms.filter((r) => {
		r.lastUpdate < new Date(Date.now() - 20 * 60 * 1000);
	});
	if (!inactiveRooms.length) return;
	
	const notifier = new InnerFunctionNotifier(); 
	
	for (const room of inactiveRooms) {
		await PlayfabCtx.rooms.delete(room.id),
		await PlayfabCtx.game[room.game].delete(room.id);
		notifier.roomDeleted(room.id);
	}
};

const cleanerPlayersInner: InnerTimeFunction = async (_timer, _context) => {
	//TODO: Remove all the guest players that have been inactive for a while
};

registerTimeFunction('cleaner_rooms', '0 */20 * * * *', true, cleanerRoomsInner);
//registerTimeFunction('cleaner_players', '0 */20 * * * *', true, cleanerPlayersInner);