import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { playfabServerPost } from '../playfab';

interface Statistic { name: string; value: number; }
interface UpdateBody { playFabId: string; statistics: Statistic[]; }

interface PlayFabLeaderboardEntry {
	PlayFabId: string;
	DisplayName: string;
	StatValue: number;
	Position: number;
}

app.http('updateStats', {
	methods: ['POST'],
	authLevel: 'anonymous',
	route: 'stats/update',
	handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
		try {
			const { playFabId, statistics } = await request.json() as UpdateBody;
			await playfabServerPost('/Server/UpdatePlayerStatistics', {
				PlayFabId: playFabId,
				Statistics: statistics.map(s => ({ StatisticName: s.name, Value: s.value })),
			});
			return { jsonBody: { success: true } };
		} catch (err) {
			return { status: 500, jsonBody: { error: (err as Error).message } };
		}
	},
});

app.http('getLeaderboard', {
	methods: ['GET'],
	authLevel: 'anonymous',
	route: 'stats/leaderboard/{statName}',
	handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
		try {
			const statName = request.params['statName'];
			const data = await playfabServerPost<{ Leaderboard: PlayFabLeaderboardEntry[] }>('/Server/GetLeaderboard', {
				StatisticName: statName,
				StartPosition: 0,
				MaxResultsCount: 10,
			});
			return {
				jsonBody: data.Leaderboard.map(e => ({
					playFabId: e.PlayFabId,
					displayName: e.DisplayName,
					value: e.StatValue,
					position: e.Position,
				})),
			};
		} catch (err) {
			return { status: 500, jsonBody: { error: (err as Error).message } };
		}
	},
});
