import { LeaderboardEntry, UpdateStatsRequest } from '@gandogames/common/api';
import { InnerFunction, pfPromise, PlayFabServer, registerAzureHttpFunction } from '..';

const statsUpdateInner: InnerFunction<UpdateStatsRequest, { success: boolean }> = async (body, _params, options) => {
	options.errorCode = 500;
	await pfPromise<PlayFabServerModels.UpdatePlayerStatisticsResult>(
		cb => PlayFabServer.UpdatePlayerStatistics({
			PlayFabId: body.playFabId,
			Statistics: body.statistics.map(s => ({ StatisticName: s.name, Value: s.value })),
		}, cb),
	);
	return { success: true };
};

const statsLeaderboardInner: InnerFunction<never, LeaderboardEntry[]> = async (_body, params, options) => {
	options.errorCode = 500;
	const data = await pfPromise<PlayFabServerModels.GetLeaderboardResult>(
		cb => PlayFabServer.GetLeaderboard({
			StatisticName: params['statName'],
			StartPosition: 0,
			MaxResultsCount: 10,
		}, cb),
	);
	return (data.Leaderboard ?? []).map((e): LeaderboardEntry => ({
		playFabId: e.PlayFabId!,
		displayName: e.DisplayName!,
		value: e.StatValue!,
		position: e.Position!,
	}));
};

registerAzureHttpFunction('stats_update', 'POST', 'stats/update', statsUpdateInner);
registerAzureHttpFunction('stats_getLeaderboard', 'GET', 'stats/leaderboard/{statName}', statsLeaderboardInner);