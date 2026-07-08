import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { ToastService } from '@gandogames/services';

export interface Swatch {
	name: string;
	/** CSS value to use as swatch background. Use 'var(--x)' for theme tokens so it resolves per half. */
	cssRef: string;
	values: { dark: string; light: string };
	isShadow?: boolean;
}

export interface Section {
	title: string;
	swatches: Swatch[];
}

@Component({
	selector: 'gg-palette',
	imports: [IonIcon, NgTemplateOutlet],
	templateUrl: './palette.component.html',
	styleUrl: './palette.component.scss',
})
export class PaletteComponent {
	public readonly toast = inject(ToastService);

	public testProgress(): void {
		const id = this.toast.progress('Loading something heavy…');
		setTimeout(() => this.toast.dismiss(id), 3000);
	}

	public async testYesNo(): Promise<void> {
		const confirmed = await this.toast.yesNo('Do you confirm this action?');
		this.toast.success(confirmed ? 'You clicked Yes' : 'You clicked No');
	}

	public getValue(swatch: Swatch, theme: string): string {
		return theme === 'light' ? swatch.values.light : swatch.values.dark;
	}

	public readonly sections: Section[] = [
		{
			title: 'Surfaces',
			swatches: [
				{ name: '--bg',         cssRef: 'var(--bg)',         values: { dark: '#1e1409',  light: '#f5e8d2' } },
				{ name: '--bg-surface', cssRef: 'var(--bg-surface)', values: { dark: '#281a0c',  light: '#fdf4e3' } },
				{ name: '--bg-card',    cssRef: 'var(--bg-card)',    values: { dark: '#362410',  light: '#ecddbf' } },
			],
		},
		{
			title: 'Text',
			swatches: [
				{ name: '--text',       cssRef: 'var(--text)',       values: { dark: '#f2e4c8',  light: '#1e1208' } },
				{ name: '--text-muted', cssRef: 'var(--text-muted)', values: { dark: '#9e8060',  light: '#7c6040' } },
			],
		},
		{
			title: 'Accent',
			swatches: [
				{ name: '--accent',           cssRef: 'var(--accent)',           values: { dark: '#c8821e', light: '#8b5a2b' } },
				{ name: '--accent-hover',     cssRef: 'var(--accent-hover)',     values: { dark: '#e0971f', light: '#7a4e22' } },
				{ name: '--accent-tint',      cssRef: 'var(--accent-tint)',      values: { dark: 'rgba(200,130,30,0.04)', light: 'rgba(139,90,43,0.04)' } },
				{ name: '--accent-subtle',    cssRef: 'var(--accent-subtle)',    values: { dark: 'rgba(200,130,30,0.08)', light: 'rgba(139,90,43,0.08)' } },
				{ name: '--accent-muted',     cssRef: 'var(--accent-muted)',     values: { dark: 'rgba(200,130,30,0.12)', light: 'rgba(139,90,43,0.12)' } },
				{ name: '--accent-emphasis',  cssRef: 'var(--accent-emphasis)',  values: { dark: 'rgba(200,130,30,0.35)', light: 'rgba(139,90,43,0.35)' } },
			],
		},
		{
			title: 'Borders & Overlays',
			swatches: [
				{ name: '--border-color',         cssRef: 'var(--border-color)',         values: { dark: 'rgba(180,110,40,0.18)',  light: 'rgba(120,75,25,0.18)' } },
				{ name: '--hover-overlay',        cssRef: 'var(--hover-overlay)',        values: { dark: 'rgba(255,200,100,0.06)', light: 'rgba(0,0,0,0.05)' } },
				{ name: '--color-neutral-subtle', cssRef: 'var(--color-neutral-subtle)', values: { dark: 'rgba(150,120,80,0.08)',  light: 'rgba(100,80,50,0.08)' } },
			],
		},
		{
			title: 'Shadows',
			swatches: [
				{ name: '--shadow-card',  cssRef: '', isShadow: true, values: { dark: '0 4px 32px rgba(0,0,0,0.45)',   light: '0 4px 32px rgba(80,40,10,0.1)' } },
				{ name: '--shadow-hover', cssRef: '', isShadow: true, values: { dark: '0 8px 24px rgba(0,0,0,0.30)',   light: '0 8px 24px rgba(80,40,10,0.12)' } },
			],
		},
		{
			title: 'Semantic — On Accent',
			swatches: [
				{ name: '$color-on-accent', cssRef: '#fff', values: { dark: '#fff', light: '#fff' } },
			],
		},
		{
			title: 'Semantic — Danger',
			swatches: [
				{ name: '$color-danger',        cssRef: '#f87171',                   values: { dark: '#f87171',                   light: '#f87171' } },
				{ name: '$color-danger-bg',     cssRef: 'rgba(248,113,113,0.1)',     values: { dark: 'rgba(248,113,113,0.1)',     light: 'rgba(248,113,113,0.1)' } },
				{ name: '$color-danger-muted',  cssRef: 'rgba(248,113,113,0.15)',    values: { dark: 'rgba(248,113,113,0.15)',    light: 'rgba(248,113,113,0.15)' } },
				{ name: '$color-danger-dim',    cssRef: 'rgba(248,113,113,0.2)',     values: { dark: 'rgba(248,113,113,0.2)',     light: 'rgba(248,113,113,0.2)' } },
				{ name: '$color-danger-border', cssRef: 'rgba(248,113,113,0.3)',     values: { dark: 'rgba(248,113,113,0.3)',     light: 'rgba(248,113,113,0.3)' } },
			],
		},
		{
			title: 'Semantic — Success',
			swatches: [
				{ name: '$color-success',        cssRef: '#18b150',                  values: { dark: '#18b150',                  light: '#18b150' } },
				{ name: '$color-success-bg',     cssRef: 'rgba(74,222,128,0.12)',    values: { dark: 'rgba(74,222,128,0.12)',    light: 'rgba(74,222,128,0.12)' } },
				{ name: '$color-success-border', cssRef: 'rgba(74,222,128,0.2)',     values: { dark: 'rgba(74,222,128,0.2)',     light: 'rgba(74,222,128,0.2)' } },
			],
		},
		{
			title: 'Semantic — Warning',
			swatches: [
				{ name: '$color-warning',        cssRef: '#f59e0b',                  values: { dark: '#f59e0b',                  light: '#f59e0b' } },
				{ name: '$color-warning-bg',     cssRef: 'rgba(245,158,11,0.12)',    values: { dark: 'rgba(245,158,11,0.12)',    light: 'rgba(245,158,11,0.12)' } },
				{ name: '$color-warning-border', cssRef: 'rgba(245,158,11,0.3)',     values: { dark: 'rgba(245,158,11,0.3)',     light: 'rgba(245,158,11,0.3)' } },
			],
		},
	];
}
