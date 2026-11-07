import { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { AdProvider } from '../models/ads.model';

export class AdMobProvider implements AdProvider {
  private bannerVisible = false;

  async initialize(testing: boolean): Promise<void> {
    await AdMob.initialize({ initializeForTesting: testing });
    const consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable === true && consent.status === AdmobConsentStatus.REQUIRED) {
      await AdMob.showConsentForm();
    }
  }

  async showBanner(adUnitId: string, testing: boolean): Promise<void> {
    if (this.bannerVisible) {
      await AdMob.resumeBanner();
      return;
    }
    await AdMob.showBanner({
      adId: adUnitId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 76,
      isTesting: testing,
    });
    this.bannerVisible = true;
  }

  async hideBanner(): Promise<void> {
    if (this.bannerVisible) {
      await AdMob.hideBanner();
    }
  }

  async showConsentForm(): Promise<void> {
    await AdMob.showConsentForm();
  }
}
