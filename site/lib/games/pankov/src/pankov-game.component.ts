import { Component, Input } from '@angular/core';

@Component({
	selector: 'gg-pankov-game',
	standalone: true,
	imports: [],
	template: `
		<div class="pankov-game">
			<p>Pankov multiplayer — coming soon</p>
		</div>
	`,
	styles: [`.pankov-game { padding: 2rem; color: #888; }`],
})
export class PankovGameComponent {
	@Input() roomId!: string;
}
