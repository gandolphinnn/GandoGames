import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { ToastService, AdminService, UserService } from '@gandogames/services';
import { RefreshableContentComponent } from '@gandogames/components';
import { DatePipe } from '@angular/common';

@Component({
	selector: 'gg-labels',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS, RefreshableContentComponent, DatePipe],
	templateUrl: './labels.component.html',
	styleUrl: './labels.component.scss',
})
export class LabelsComponent implements OnInit {
	private readonly admin = inject(AdminService);
	private readonly user = inject(UserService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);

	public readonly locale = this.user.locale;
	public readonly loading = signal(false);
	public readonly labels = this.admin.labels;

	public ngOnInit(): void {
		void this.fetchLabels();
	}

	public readonly refreshFn = async (): Promise<void> => {
		await this.fetchLabels();
	};
	
	private async fetchLabels(): Promise<void> {
		try {
			this.loading.set(true);
			await this.admin.loadLabels();
		} finally {
			this.loading.set(false);
		}
	}
	
	public async deleteLabel(labelId: string) {
		try {
			this.loading.set(true);
			await this.admin.deleteLabel(labelId);
		} finally {
			this.loading.set(false);
		}
	}
}
