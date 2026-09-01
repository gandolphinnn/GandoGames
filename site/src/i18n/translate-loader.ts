import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import en from './en.json';
import it from './it.json';

const TRANSLATIONS: Record<string, TranslationObject> = { en, it };

/** Serves the bundled translation JSONs synchronously — no HTTP fetch, no untranslated flash. */
@Injectable()
export class StaticTranslateLoader extends TranslateLoader {
	public getTranslation(lang: string): Observable<TranslationObject> {
		return of(TRANSLATIONS[lang] ?? TRANSLATIONS['en']);
	}
}
