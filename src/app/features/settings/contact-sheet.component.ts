import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PLAY_ORDERS_URL, SUPPORT_EMAIL } from '@core/config/app.constants';
import { APP_VERSION } from '@core/config/version';
import { TranslationKey } from '@core/i18n/en';
import { I18nService } from '@core/i18n/i18n.service';
import { LinksService } from '@core/services/links.service';
import { UiService } from '@core/services/ui.service';
import { SheetComponent } from '@shared/components/sheet.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

type Topic = 'idea' | 'problem' | 'payment';

interface TopicOption {
  readonly id: Topic;
  readonly label: TranslationKey;
}

const TOPICS: readonly TopicOption[] = [
  { id: 'idea', label: 'contact.idea' },
  { id: 'problem', label: 'contact.problem' },
  { id: 'payment', label: 'contact.payment' },
];

const MAX_LENGTH = 2000;

@Component({
  selector: 'app-contact-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, TranslatePipe],
  template: `
    <app-sheet [title]="'contact.title' | t" [closeLabel]="'common.close' | t" (closed)="ui.closeSheet()">
      <h3>{{ 'contact.step1' | t }}</h3>
      <div class="topics" role="radiogroup">
        @for (option of topics; track option.id) {
          <button
            type="button"
            class="chip"
            role="radio"
            [class.accent]="topic() === option.id"
            [attr.aria-checked]="topic() === option.id"
            (click)="topic.set(option.id)"
          >
            {{ option.label | t }}
          </button>
        }
      </div>

      @if (topic() === 'payment') {
        <div class="note">
          <span>{{ 'contact.refundHint' | t }}</span>
          <button type="button" class="btn small" (click)="links.open(ordersUrl)">{{ 'contact.orders' | t }}</button>
        </div>
      }

      <h3>{{ 'contact.step2' | t }}</h3>
      <textarea
        rows="5"
        [maxLength]="maxLength"
        [placeholder]="'contact.placeholder' | t"
        [value]="message()"
        (input)="onInput($event)"
      ></textarea>

      <button type="button" class="btn accent block" [disabled]="!canSend()" (click)="send()">
        {{ 'contact.send' | t }}
      </button>
      <p class="hint">{{ 'contact.sendHint' | t }}</p>
    </app-sheet>
  `,
  styles: `
    h3 {
      margin: 6px 4px 10px;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .topics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
    }
    .topics .chip {
      height: 42px;
      font-family: var(--font);
      font-size: 14px;
      font-weight: 800;
    }
    .note {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 18px;
      padding: 12px 14px;
      border-radius: 16px;
      background: var(--accent-soft);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.45;
    }
    textarea {
      display: block;
      width: 100%;
      margin-bottom: 16px;
      padding: 14px 16px;
      border: 0;
      border-radius: 18px;
      background: rgb(255 255 255 / 0.08);
      color: var(--text);
      font: inherit;
      font-size: 16px;
      line-height: 1.45;
      resize: none;
    }
    textarea:focus {
      outline: 2px solid var(--accent);
    }
    textarea::placeholder {
      color: var(--text-muted);
    }
    .hint {
      margin: 10px 4px 0;
      color: var(--text-muted);
      font-size: 13px;
      text-align: center;
    }
  `,
})
export class ContactSheetComponent {
  protected readonly ui = inject(UiService);
  protected readonly links = inject(LinksService);
  private readonly i18n = inject(I18nService);

  protected readonly topics = TOPICS;
  protected readonly maxLength = MAX_LENGTH;
  protected readonly ordersUrl = PLAY_ORDERS_URL;
  protected readonly topic = signal<Topic>('idea');
  protected readonly message = signal<string>('');
  protected readonly canSend = computed<boolean>(() => this.message().trim().length > 0);

  protected onInput(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) {
      this.message.set(event.target.value);
    }
  }

  protected send(): void {
    const label = TOPICS.find((option) => option.id === this.topic())?.label ?? 'contact.idea';
    const subject = `FreeCounter · ${this.i18n.t(label)}`;
    const footer = `FreeCounter ${APP_VERSION} · ${Capacitor.getPlatform()} · ${this.i18n.language()}`;
    this.links.mail(SUPPORT_EMAIL, subject, `${this.message().trim()}\n\n—\n${footer}`);
    this.ui.closeSheet();
  }
}
