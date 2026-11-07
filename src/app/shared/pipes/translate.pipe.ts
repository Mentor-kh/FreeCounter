import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationKey } from '@core/i18n/en';
import { I18nService, TranslationParams } from '@core/i18n/i18n.service';

@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
