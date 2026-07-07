import { Component, computed, contentChild, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { GameTableSeatDef } from './game-table-seat.directive';
import { layoutSeats, TableFit, TableSeat, TableVariant } from './table-layout';

/**
 * Presentational table: seats laid out around an oval with the hero pinned
 * bottom-centre, a projected centre (`[table-center]`) and footer (`[table-footer]`),
 * and a consumer-supplied per-seat template (`[ggTableSeat]`). It owns no room or
 * game logic — every seat's inner content comes from the consumer.
 */
@Component({
	selector: 'gg-game-table',
	standalone: true,
	imports: [NgTemplateOutlet],
	templateUrl: './game-table.component.html',
	styleUrl: './game-table.component.scss',
	host: {
		'[class.table-variant-felt]': "variant() === 'felt'",
		'[class.table-variant-neutral]': "variant() === 'neutral'",
		'[class.table-fit-fill]': "fit() === 'fill'",
		'[class.table-fit-contain]': "fit() === 'contain'",
	},
})
export class GameTableComponent {
	/** Ordered seats — index 0 is the hero (bottom-centre); build with `buildTableSeats`. */
	public readonly seats = input.required<TableSeat[]>();
	public readonly variant = input<TableVariant>('neutral');
	public readonly fit = input<TableFit>('contain');
	/** Faint label rendered on the felt (e.g. the game name). */
	public readonly label = input<string | null>(null);
	/** Render the dealer button on the seat flagged `isDealer`. */
	public readonly showDealerChip = input<boolean>(false);

	/** Emitted on any seat tap — convenience for consumers not wiring their own `(click)`. */
	public readonly seatClick = output<{ seat: TableSeat; index: number }>();

	protected readonly seatDef = contentChild(GameTableSeatDef);

	// `fill` (in-game) has no header/footer scroll room, so flatten the ring vertically to keep the
	// tall player pods clear of the header above and the action bar below. `contain` (lobby) stays round.
	protected readonly positions = computed(() =>
		layoutSeats(this.seats().length, 40, this.fit() === 'fill' ? 30 : 40)
	);
}
