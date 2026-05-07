import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
	selector: 'gg-app',
	imports: [RouterOutlet, NavbarComponent, ToastComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class App {}
