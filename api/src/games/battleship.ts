import type { GamePlayer } from '@gandogames/shared/dto';
import { type BattleshipGameState, type Ship, isFleetDestroyed, isShipSunk, validateFleet } from '@gandogames/shared/battleship';
import { Game } from './game';

export class BattleshipGame extends Game<BattleshipGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 2;

	public override initialize(players: GamePlayer[]): void {
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'placement',
			players: players.map(p => ({ ...p, ships: [], ready: false, incomingShots: [] })),
			currentPlayerIndex: 0,
		};
	}

	public override getPublicState(playerId: string): BattleshipGameState {
		if (!this.state) throw new Error('Game not initialized');
		// A player sees their own full board, but only the *sunk* ships of the opponent — never the
		// opponent's un-hit ship cells. `incomingShots` is safe to expose: in a 2-player game every
		// shot on a board was fired by the other player, so it's just the viewer's own shot history.
		const players = this.state.players.map(p => {
			if (p.id === playerId) return p;
			const revealed = p.ships.filter(s => isShipSunk(s, p.incomingShots));
			return { ...p, ships: revealed };
		});
		return { ...this.state, players };
	}

	public override action(player: GamePlayer, action: string, data: any): BattleshipGameState {
		if (!this.state) throw new Error('Game not initialized');
		if (action === 'place') return this.applyPlace(player.id, data?.ships as Ship[]);
		if (action === 'fire') return this.applyFire(player.id, data?.row as number, data?.col as number);
		return this.state;
	}

	private applyPlace(playerId: string, ships: Ship[]): BattleshipGameState {
		const state = this.state!;
		if (state.gamePhase !== 'placement') return state;
		const player = state.players.find(p => p.id === playerId);
		if (!player || player.ready) return state;
		if (!validateFleet(ships)) return state;

		player.ships = ships;
		player.ready = true;
		// Both fleets placed → start firing; the host (seat 0) shoots first.
		if (state.players.every(p => p.ready)) {
			state.gamePhase = 'playing';
			state.currentPlayerIndex = 0;
		}
		state.lastUpdate = new Date();
		return state;
	}

	private applyFire(playerId: string, row: number, col: number): BattleshipGameState {
		const state = this.state!;
		if (state.gamePhase !== 'playing') return state;
		const shooterIndex = state.players.findIndex(p => p.id === playerId);
		if (shooterIndex === -1 || shooterIndex !== state.currentPlayerIndex) return state;
		if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 9 || col < 0 || col > 9) return state;

		const targetIndex = (shooterIndex + 1) % state.players.length;
		const target = state.players[targetIndex]!;
		// Each cell may be fired at only once.
		if (target.incomingShots.some(s => s.row === row && s.col === col)) return state;

		const hitShip = target.ships.find(s => s.cells.some(c => c.row === row && c.col === col));
		const result = hitShip ? 'hit' : 'miss';
		target.incomingShots.push({ row, col, result });

		const sunk = hitShip && isShipSunk(hitShip, target.incomingShots) ? hitShip.name : undefined;
		state.lastShot = { by: playerId, row, col, result, sunk };

		if (isFleetDestroyed(target.ships, target.incomingShots)) {
			state.gamePhase = 'game-over';
			state.winnerName = state.players[shooterIndex]!.name;
		} else {
			// One shot per turn — the turn passes whether it was a hit or a miss.
			state.currentPlayerIndex = targetIndex;
		}
		state.lastUpdate = new Date();
		return state;
	}
}
