import { computed, effect, inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Language } from '../models/settings.model';
import { SettingsStore } from '../services/settings.store';
import { EN, TranslationDictionary, TranslationKey } from './en';
import { RU } from './ru';

export type TranslationParams = Readonly<Record<string, string | number>>;

const DICTIONARIES: Readonly<Record<Language, TranslationDictionary>> = { en: EN, ru: RU };

const LOCALES: Readonly<Record<Language, string>> = { en: 'en-US', ru: 'ru-RU' };

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settings = inject(SettingsStore);
  private readonly document = inject(DOCUMENT);

  readonly language = this.settings.language;
  readonly locale = computed<string>(() => LOCALES[this.language()]);
  private readonly dictionary = computed<TranslationDictionary>(() => DICTIONARIES[this.language()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.language();
    });
  }

  t(key: TranslationKey, params?: TranslationParams): string {
    const template = this.dictionary()[key];
    if (params === undefined) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  /**
   * @description Picks the plural form for a number from a key whose value lists forms separated by "|"
   * (en: one|other, ru: one|few|many).
   * @param key Translation key with plural forms.
   * @param count Number that selects the form and replaces {value}.
   * @returns Translated text.
   */
  plural(key: TranslationKey, count: number): string {
    const forms = this.t(key, { value: count }).split('|');
    const category = new Intl.PluralRules(this.locale()).select(count);
    const index = category === 'one' ? 0 : category === 'few' ? 1 : forms.length - 1;
    return forms[Math.min(index, forms.length - 1)];
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.locale(), { maximumFractionDigits: 3 }).format(value);
  }

  formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  }

  formatDay(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), { day: 'numeric', month: 'long' }).format(date);
  }
}
