import { app, InvocationContext, Timer } from '@azure/functions';
import { InnerFunctionNotifier, PlayfabCtx, signalROutput } from '../../';

app.timer('cleaner', {
	schedule: '0 */20 * * * *',
	runOnStartup: true,
	useMonitor: false,
	extraOutputs: [signalROutput],
	handler: async (_timer: Timer, context: InvocationContext): Promise<void> => {
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
		context.log(`Cleaner: removed ${rooms.length} rooms`);
		
		notifier.prepareContext(context);
	},
});
