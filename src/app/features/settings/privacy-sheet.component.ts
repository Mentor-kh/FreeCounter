import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { UiService } from '@core/services/ui.service';
import { SheetComponent } from '@shared/components/sheet.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-privacy-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, TranslatePipe],
  template: `
    <app-sheet [title]="'settings.privacy' | t" [closeLabel]="'common.close' | t" (closed)="ui.closeSheet()">
      @if (i18n.language() === 'ru') {
        <iframe src="privacy-policy.html#ru" [title]="'settings.privacy' | t"></iframe>
      } @else {
        <iframe src="privacy-policy.html" [title]="'settings.privacy' | t"></iframe>
      }
    </app-sheet>
  `,
  styles: `
    iframe {
      display: block;
      width: 100%;
      height: 70dvh;
      border: 0;
      border-radius: 20px;
      background: #0b0b0d;
      color-scheme: dark;
    }
  `,
})
export class PrivacySheetComponent {
  protected readonly ui = inject(UiService);
  protected readonly i18n = inject(I18nService);
}
