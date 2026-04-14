import { PlayFabHttp } from '../playfab';
import { UpdateStatsRequest, LeaderboardEntry } from '@gandogames/common/api';
import { InnerFunction, registerAzureHttpFunction } from '../utils';

interface PlayFabLeaderboardEntry {
	PlayFabId: string;
	DisplayName: string;
	StatValue: number;
	Position: number;
}

const updateStats: InnerFunction<UpdateStatsRequest, { success: boolean }> = (body, _params) => ({
	promise: PlayFabHttp.server('UpdatePlayerStatistics', {
		PlayFabId: body.playFabId,
		Statistics: body.statistics.map(s => ({ StatisticName: s.name, Value: s.value })),
	}).then(() => ({ success: true })),
	errorCode: 500,
});

const getLeaderboard: InnerFunction<undefined, LeaderboardEntry[]> = (_body, params) => ({
	promise: PlayFabHttp.server<{ Leaderboard: PlayFabLeaderboardEntry[] }>('GetLeaderboard', {
		StatisticName: params['statName'],
		StartPosition: 0,
		MaxResultsCount: 10,
	}).then(data => data.Leaderboard.map(e => ({
		playFabId: e.PlayFabId,
		displayName: e.DisplayName,
		value: e.StatValue,
		position: e.Position,
	}))),
	errorCode: 500,
});

registerAzureHttpFunction('stats_update', 'POST', 'stats/update', updateStats);
registerAzureHttpFunction('stats_getLeaderboard', 'GET', 'stats/leaderboard/{statName}', getLeaderboard);
