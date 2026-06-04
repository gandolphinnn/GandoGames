import { pfPromise } from '..';
import { mockPlayFabAdmin, mockPlayFabClient, mockPlayFabServer } from './mockPlayFab';

// Drives a mock SDK method through pfPromise exactly as the functions do. Returns `any` because the
// assertions only inspect runtime values (mirrors index.spec.ts's `pfPromise(call as any)` style).
function invoke(fn: (cb: any) => void): Promise<any> {
	return pfPromise(fn as any);
}

describe('mockPlayFab (in-memory PlayFab simulation)', () => {
	describe('guest auth', () => {
		it('creates a guest on first custom-id login and round-trips the stateless ticket', async () => {
			const login = await invoke(cb => mockPlayFabClient.LoginWithCustomID({ CustomId: 'guest-alpha', CreateAccount: true }, cb));
			expect(login.PlayFabId).toBeTruthy();
			expect(login.NewlyCreated).toBe(true);
			expect(login.SessionTicket).toBeTruthy();

			const auth = await invoke(cb => mockPlayFabServer.AuthenticateSessionTicket({ SessionTicket: login.SessionTicket }, cb));
			expect(auth.UserInfo.PlayFabId).toBe(login.PlayFabId);
			expect(auth.UserInfo.Username).toBeUndefined(); // no Username → authenticateSession treats as guest
		});

		it('returns the same player for the same custom id', async () => {
			const first = await invoke(cb => mockPlayFabClient.LoginWithCustomID({ CustomId: 'guest-bravo', CreateAccount: true }, cb));
			const second = await invoke(cb => mockPlayFabClient.LoginWithCustomID({ CustomId: 'guest-bravo', CreateAccount: true }, cb));
			expect(second.PlayFabId).toBe(first.PlayFabId);
			expect(second.NewlyCreated).toBe(false);
		});

		it('persists a display name set via UpdateUserTitleDisplayName', async () => {
			const login = await invoke(cb => mockPlayFabClient.LoginWithCustomID({ CustomId: 'guest-charlie', CreateAccount: true }, cb));
			await invoke(cb => mockPlayFabClient.UpdateUserTitleDisplayName({ DisplayName: 'Guest042' }, cb));
			const auth = await invoke(cb => mockPlayFabServer.AuthenticateSessionTicket({ SessionTicket: login.SessionTicket }, cb));
			expect(auth.UserInfo.TitleInfo.DisplayName).toBe('Guest042');
		});
	});

	describe('registered auth', () => {
		it('registers, logs in with email/password, and exposes the username', async () => {
			const reg = await invoke(cb => mockPlayFabClient.RegisterPlayFabUser({ Email: 'alice@example.com', Password: 'pw123456', Username: 'alice' }, cb));
			expect(reg.PlayFabId).toBeTruthy();

			const login = await invoke(cb => mockPlayFabClient.LoginWithEmailAddress({ Email: 'alice@example.com', Password: 'pw123456' }, cb));
			expect(login.PlayFabId).toBe(reg.PlayFabId);
			expect(login.InfoResultPayload.AccountInfo.Username).toBe('alice');

			const auth = await invoke(cb => mockPlayFabServer.AuthenticateSessionTicket({ SessionTicket: login.SessionTicket }, cb));
			expect(auth.UserInfo.Username).toBe('alice'); // has Username → authenticateSession treats as registered
		});

		it('rejects a wrong password', async () => {
			await invoke(cb => mockPlayFabClient.RegisterPlayFabUser({ Email: 'bob@example.com', Password: 'right123', Username: 'bob' }, cb));
			await expect(
				invoke(cb => mockPlayFabClient.LoginWithEmailAddress({ Email: 'bob@example.com', Password: 'wrong123' }, cb)),
			).rejects.toThrow();
		});
	});

	describe('shared groups (room / game storage)', () => {
		it('upserts, gets by key, lists all, and removes', async () => {
			const groupId = 'TEST_ROOMS_INDEX';
			await invoke(cb => mockPlayFabServer.CreateSharedGroup({ SharedGroupId: groupId }, cb));
			await invoke(cb => mockPlayFabServer.UpdateSharedGroupData({ SharedGroupId: groupId, Data: { ROOM1: JSON.stringify({ id: 'ROOM1' }) } }, cb));
			await invoke(cb => mockPlayFabServer.UpdateSharedGroupData({ SharedGroupId: groupId, Data: { ROOM2: JSON.stringify({ id: 'ROOM2' }) } }, cb));

			const byKey = await invoke(cb => mockPlayFabServer.GetSharedGroupData({ SharedGroupId: groupId, Keys: ['ROOM1'] }, cb));
			expect(Object.keys(byKey.Data)).toEqual(['ROOM1']);

			const all = await invoke(cb => mockPlayFabServer.GetSharedGroupData({ SharedGroupId: groupId }, cb));
			expect(Object.keys(all.Data).sort()).toEqual(['ROOM1', 'ROOM2']);

			await invoke(cb => mockPlayFabServer.UpdateSharedGroupData({ SharedGroupId: groupId, KeysToRemove: ['ROOM1'] }, cb));
			const afterDelete = await invoke(cb => mockPlayFabServer.GetSharedGroupData({ SharedGroupId: groupId }, cb));
			expect(Object.keys(afterDelete.Data)).toEqual(['ROOM2']);
		});
	});

	describe('user data (profile)', () => {
		it('round-trips icon/theme and omits unset keys', async () => {
			const reg = await invoke(cb => mockPlayFabClient.RegisterPlayFabUser({ Email: 'profile@example.com', Password: 'pw123456', Username: 'profileuser' }, cb));
			await invoke(cb => mockPlayFabServer.UpdateUserData({ PlayFabId: reg.PlayFabId, Data: { icon: 'cat', theme: 'light' } }, cb));
			const data = await invoke(cb => mockPlayFabServer.GetUserData({ PlayFabId: reg.PlayFabId, Keys: ['icon', 'theme', 'language'] }, cb));
			expect(data.Data.icon.Value).toBe('cat');
			expect(data.Data.theme.Value).toBe('light');
			expect(data.Data.language).toBeUndefined();
		});
	});

	describe('friends (tag-based directed edges)', () => {
		it('creates an edge, sets a tag, lists it, then removes it', async () => {
			await invoke(cb => mockPlayFabServer.AddFriend({ PlayFabId: 'P_owner', FriendPlayFabId: 'P_friend' }, cb));
			await invoke(cb => mockPlayFabServer.SetFriendTags({ PlayFabId: 'P_owner', FriendPlayFabId: 'P_friend', Tags: ['accepted'] }, cb));

			const list = await invoke(cb => mockPlayFabServer.GetFriendsList({ PlayFabId: 'P_owner' }, cb));
			expect(list.Friends).toHaveLength(1);
			expect(list.Friends[0].FriendPlayFabId).toBe('P_friend');
			expect(list.Friends[0].Tags).toEqual(['accepted']);

			await invoke(cb => mockPlayFabServer.RemoveFriend({ PlayFabId: 'P_owner', FriendPlayFabId: 'P_friend' }, cb));
			const after = await invoke(cb => mockPlayFabServer.GetFriendsList({ PlayFabId: 'P_owner' }, cb));
			expect(after.Friends).toHaveLength(0);
		});

		it('rejects re-adding an existing edge, matching PlayFab (callers tolerate this)', async () => {
			await invoke(cb => mockPlayFabServer.AddFriend({ PlayFabId: 'P_x', FriendPlayFabId: 'P_y' }, cb));
			await expect(
				invoke(cb => mockPlayFabServer.AddFriend({ PlayFabId: 'P_x', FriendPlayFabId: 'P_y' }, cb)),
			).rejects.toThrow();
		});
	});

	describe('title internal data (guest registry)', () => {
		it('round-trips a value', async () => {
			await invoke(cb => mockPlayFabServer.SetTitleInternalData({ Key: 'guest_player_ids', Value: JSON.stringify(['G_1', 'G_2']) }, cb));
			const result = await invoke(cb => mockPlayFabServer.GetTitleInternalData({ Keys: ['guest_player_ids'] }, cb));
			expect(JSON.parse(result.Data.guest_player_ids)).toEqual(['G_1', 'G_2']);
		});
	});

	describe('admin', () => {
		it('deletes a player so subsequent account lookups fail', async () => {
			const reg = await invoke(cb => mockPlayFabClient.RegisterPlayFabUser({ Email: 'del@example.com', Password: 'pw123456', Username: 'deluser' }, cb));
			await invoke(cb => mockPlayFabAdmin.DeletePlayer({ PlayFabId: reg.PlayFabId }, cb));
			await expect(
				invoke(cb => mockPlayFabServer.GetUserAccountInfo({ PlayFabId: reg.PlayFabId }, cb)),
			).rejects.toThrow();
		});
	});
});
