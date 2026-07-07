import { Directive, inject, TemplateRef } from '@angular/core';
import { TableSeat } from './table-layout';

/** Context handed to a seat template: the seat model plus its ring index. */
export interface SeatContext {
	$implicit: TableSeat;
	index: number;
}

/**
 * Carries the per-seat content template for `gg-game-table`. One template renders
 * both occupied and open seats (branch on `seat.player` inside it). The static
 * `ngTemplateContextGuard` gives the consumer typed `let-seat`/`let-i="index"`.
 */
@Directive({ selector: '[ggTableSeat]', standalone: true })
export class GameTableSeatDef {
	public readonly template = inject<TemplateRef<SeatContext>>(TemplateRef);

	public static ngTemplateContextGuard(_dir: GameTableSeatDef, ctx: unknown): ctx is SeatContext {
		return true;
	}
}
