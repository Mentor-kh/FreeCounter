import { computed, inject, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ADS_CONFIG } from '../config/app.constants';
import { AdPlacement, AdProvider } from '../models/ads.model';
import { AdMobProvider } from '../providers/admob.provider';
import { PurchaseService } from './purchase.service';

@Injectable({ providedIn: 'root' })
export class AdsService {
  private readonly purchases = inject(PurchaseService);
  private readonly provider: AdProvider | null =
    ADS_CONFIG.enabled && Capacitor.isNativePlatform() ? new AdMobProvider() : null;
  private readonly initialized = signal(false);

  readonly enabled = computed<boolean>(
    () =>
      this.provider !== null &&
      this.initialized() &&
      !(ADS_CONFIG.disableForPayingUsers && this.purchases.hasAnyPurchase()),
  );
  readonly consentAvailable = this.provider !== null;

  async initialize(): Promise<void> {
    if (this.provider === null) {
      return;
    }
    try {
      await this.provider.initialize(ADS_CONFIG.testing);
      this.initialized.set(true);
    } catch {
      this.initialized.set(false);
    }
  }

  async show(placement: AdPlacement): Promise<void> {
    if (this.provider === null || !this.enabled() || !ADS_CONFIG.placements.includes(placement)) {
      return;
    }
    await this.provider.showBanner(ADS_CONFIG.bannerAdUnitId, ADS_CONFIG.testing).catch(() => undefined);
  }

  async hide(): Promise<void> {
    await this.provider?.hideBanner().catch(() => undefined);
  }

  async showConsentForm(): Promise<void> {
    await this.provider?.showConsentForm().catch(() => undefined);
  }
}
