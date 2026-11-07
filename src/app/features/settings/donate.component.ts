import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CUSTOM_TIP_URL, TIP_OPTIONS, WEB_DONATE_URL } from '@core/config/app.constants';
import { I18nService } from '@core/i18n/i18n.service';
import { TipProductId } from '@core/models/purchase.model';
import { HapticsService } from '@core/services/haptics.service';
import { LinksService } from '@core/services/links.service';
import { PurchaseService } from '@core/services/purchase.service';
import { UiService } from '@core/services/ui.service';
import { purchaseMessageKey } from '@features/looks/purchase-messages';
import { IconComponent } from '@shared/components/icon.component';
import { RippleDirective } from '@shared/directives/ripple.directive';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

export type DonateMode = 'play' | 'link' | 'none';

/**
 * @description Picks how tips are collected: Google Play products inside the Android app (and the mock in dev),
 * an external donation page on the web, or nothing when no page is configured.
 * @returns The donate mode for the current platform.
 */
export function donateMode(): DonateMode {
  if (Capacitor.isNativePlatform() || isDevMode()) {
    return 'play';
  }
  return WEB_DONATE_URL === null ? 'none' : 'link';
}

@Component({
  selector: 'app-donate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RippleDirective, TranslatePipe],
  template: `
    <div class="head">
      <span class="coin gold"><app-icon name="heart" [size]="22" /></span>
      <div>
        <h2>{{ 'donate.title' | t }}</h2>
        <p>{{ (webUrl ? 'donate.webHint' : purchases.supporter() ? 'donate.supporter' : 'donate.hint') | t }}</p>
      </div>
    </div>
    @if (webUrl; as url) {
      <button type="button" class="amount gold web" appRipple (click)="links.open(url)">
        <app-icon name="heart" [size]="20" />
        {{ 'donate.web' | t }}
      </button>
    } @else {
      <div class="amounts">
        @for (tip of tips; track tip.productId) {
          <button
            type="button"
            class="amount gold"
            appRipple
            [disabled]="purchases.busy() !== null"
            [class.busy]="purchases.busy() === tip.productId"
            (click)="give(tip.productId)"
          >
            {{ tip.amount }}<small>₴</small>
          </button>
        }
        @if (customUrl; as url) {
          <button type="button" class="amount more" [attr.aria-label]="'donate.custom' | t" (click)="links.open(url)">
            <app-icon name="plus" [size]="20" />
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 18px;
      border-radius: 28px;
      background:
        radial-gradient(circle at 0% 0%, rgb(255 211 77 / 0.18), transparent 55%),
        var(--glass);
      backdrop-filter: blur(22px) saturate(1.5);
      -webkit-backdrop-filter: blur(22px) saturate(1.5);
    }
    .head {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .coin {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }
    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
    }
    p {
      margin: 3px 0 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.4;
    }
    .amounts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .amount {
      flex: 1 0 58px;
      height: 52px;
      padding: 0;
      border-radius: 18px;
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      transition: transform 0.25s var(--spring);
      animation: rise 0.4s var(--ease-out) both;
    }
    .amount small {
      margin-left: 2px;
      font-size: 0.7em;
    }
    .amount:active:not(:disabled) {
      transform: scale(0.92);
    }
    .amount:disabled:not(.busy) {
      opacity: 0.55;
    }
    .amount.busy {
      animation: busy 0.9s ease-in-out infinite alternate;
    }
    .web {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      margin-top: 16px;
      font-size: 16px;
    }
    .more {
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border: 0;
      background: rgb(255 255 255 / 0.08);
      color: var(--text);
      font-family: var(--font);
      font-size: 14px;
      font-weight: 800;
    }
    @keyframes busy {
      to {
        filter: brightness(1.25);
        transform: scale(0.96);
      }
    }
  `,
})
export class DonateComponent {
  protected readonly purchases = inject(PurchaseService);
  private readonly ui = inject(UiService);
  private readonly i18n = inject(I18nService);
  private readonly haptics = inject(HapticsService);

  protected readonly links = inject(LinksService);
  protected readonly tips = TIP_OPTIONS;
  protected readonly customUrl = CUSTOM_TIP_URL;
  protected readonly webUrl = donateMode() === 'link' ? WEB_DONATE_URL : null;

  protected async give(productId: TipProductId): Promise<void> {
    const result = await this.purchases.buy(productId);
    if (result.outcome === 'cancelled') {
      return;
    }
    if (result.outcome === 'purchased') {
      this.haptics.fire('success');
      this.ui.celebrate(this.i18n.t('purchase.thanks'), '♥');
      return;
    }
    this.ui.showToast(this.i18n.t(purchaseMessageKey(result.outcome)), 'info');
  }
}
