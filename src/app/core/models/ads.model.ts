export type AdPlacement = 'looks' | 'settings';

export interface AdsConfig {
  readonly enabled: boolean;
  readonly testing: boolean;
  readonly bannerAdUnitId: string;
  readonly placements: readonly AdPlacement[];
  readonly disableForPayingUsers: boolean;
}

export interface AdProvider {
  initialize(testing: boolean): Promise<void>;
  showBanner(adUnitId: string, testing: boolean): Promise<void>;
  hideBanner(): Promise<void>;
  showConsentForm(): Promise<void>;
}
