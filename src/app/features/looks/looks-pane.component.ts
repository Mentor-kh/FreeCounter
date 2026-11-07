import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ART_THEMES } from '@core/config/themes.catalog';
import { ACCENT_PRESETS, PROMO_END_DATE, STARTER_PACK_THEMES } from '@core/config/app.constants';
import { TranslationKey } from '@core/i18n/en';
import { I18nService } from '@core/i18n/i18n.service';
import { ProductId } from '@core/models/purchase.model';
import { ArtTheme, ArtThemeId } from '@core/models/theme.model';
import { PagerService } from '@core/services/pager.service';
import { PurchaseService } from '@core/services/purchase.service';
import { ThemeService } from '@core/services/theme.service';
import { UiService } from '@core/services/ui.service';
import { IconComponent } from '@shared/components/icon.component';
import { RippleDirective } from '@shared/directives/ripple.directive';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { injectTicker } from '@shared/utils/ticker';
import { purchaseMessageKey } from './purchase-messages';

interface ThemeCard {
  readonly theme: ArtTheme;
  readonly nameKey: TranslationKey;
  readonly owned: boolean;
  readonly active: boolean;
  readonly inPack: boolean;
  readonly productId: ProductId | null;
}

@Component({
  selector: 'app-looks-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RippleDirective, TranslatePipe],
  templateUrl: './looks-pane.component.html',
  styleUrl: './looks-pane.component.scss',
})
export class LooksPaneComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly purchases = inject(PurchaseService);
  private readonly pager = inject(PagerService);
  private readonly i18n = inject(I18nService);
  private readonly ui = inject(UiService);

  protected readonly presets = ACCENT_PRESETS;
  protected readonly packThumbs = STARTER_PACK_THEMES.map((id) => `themes/${id}/thumb.webp`);
  protected readonly visible = computed<boolean>(() => this.pager.pane() === 'looks');
  protected readonly authoredHint = computed<TranslationKey>(() =>
    this.purchases.unlockedThemes().size >= ART_THEMES.length ? 'looks.authoredFreeHint' : 'looks.authoredHint',
  );
  private readonly now = injectTicker(
    computed(() => this.visible() && this.purchases.promoActive()),
    30_000,
  );

  protected readonly customActive = computed<boolean>(() => this.theme.activeArt() === null);
  protected readonly cards = computed<readonly ThemeCard[]>(() => {
    const unlocked = this.purchases.unlockedThemes();
    return this.theme.themes.map((theme) => ({
      theme,
      nameKey: `theme.${theme.id}`,
      owned: unlocked.has(theme.id),
      active: this.theme.activeArt() === theme.id,
      inPack: STARTER_PACK_THEMES.includes(theme.id),
      productId: this.purchases.productForTheme(theme.id),
    }));
  });
  protected readonly promoDate = computed<string>(() => this.i18n.formatDay(PROMO_END_DATE));
  protected readonly countdown = computed<string>(() => {
    const left = Math.max(0, PROMO_END_DATE.getTime() - this.now());
    const days = Math.floor(left / 86_400_000);
    const hours = Math.floor((left % 86_400_000) / 3_600_000);
    if (days > 0) {
      return `${this.i18n.t('looks.days', { value: days })} ${this.i18n.t('looks.hours', { value: hours })}`;
    }
    const minutes = Math.floor((left % 3_600_000) / 60_000);
    return `${this.i18n.t('looks.hours', { value: hours })} ${this.i18n.t('looks.minutes', { value: minutes })}`;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        void this.purchases.refresh();
      }
    });
  }

  protected isAccent(color: string): boolean {
    return this.customActive() && this.theme.accent() === color;
  }

  protected pickColor(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.theme.setAccent(event.target.value);
    }
  }

  protected tapCard(card: ThemeCard): void {
    if (card.owned) {
      this.theme.selectArt(card.theme.id);
    } else if (card.productId !== null) {
      void this.buy(card.productId, card.theme.id);
    }
  }

  protected async buy(productId: ProductId, themeId: ArtThemeId | null): Promise<void> {
    const result = await this.purchases.buy(productId);
    if (result.outcome === 'cancelled') {
      return;
    }
    this.ui.showToast(this.i18n.t(purchaseMessageKey(result.outcome)), result.outcome === 'purchased' ? 'success' : 'info');
    if (result.outcome === 'purchased') {
      this.theme.selectArt(themeId ?? STARTER_PACK_THEMES[0]);
    }
  }
}
