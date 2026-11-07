import { AdsConfig } from '../models/ads.model';
import { CatalogProduct, ThemeProductId, TipOption } from '../models/purchase.model';
import { ArtThemeId } from '../models/theme.model';

export const PROMO_END_DATE: Date = new Date('2026-12-31T23:59:59+02:00');

export const STARTER_PACK_THEMES: readonly ArtThemeId[] = ['psychedelic', 'latte', 'nebula', 'matcha', 'cyber'];

export interface ThemeProductLink {
  readonly themeId: ArtThemeId;
  readonly productId: ThemeProductId;
}

export const THEME_PRODUCTS: readonly ThemeProductLink[] = [
  { themeId: 'psychedelic', productId: 'theme_psychedelic' },
  { themeId: 'latte', productId: 'theme_latte' },
  { themeId: 'nebula', productId: 'theme_nebula' },
  { themeId: 'matcha', productId: 'theme_matcha' },
  { themeId: 'cyber', productId: 'theme_cyber' },
  { themeId: 'aurora', productId: 'theme_aurora' },
];

export const TIP_OPTIONS: readonly TipOption[] = [
  { productId: 'tip_25', amount: 25 },
  { productId: 'tip_50', amount: 50 },
  { productId: 'tip_75', amount: 75 },
  { productId: 'tip_100', amount: 100 },
];

export const CUSTOM_TIP_URL: string | null = null;

export const WEB_DONATE_URL: string | null = null;

export const WEB_THEMES_FREE = true;

const SINGLE_THEME_PRICE = '39 ₴';

export const PRODUCT_CATALOG: readonly CatalogProduct[] = [
  { id: 'pack_starter_promo', kind: 'pack', unlocks: STARTER_PACK_THEMES, fallbackPrice: '39 ₴' },
  { id: 'pack_starter', kind: 'pack', unlocks: STARTER_PACK_THEMES, fallbackPrice: '139 ₴' },
  ...THEME_PRODUCTS.map(
    (link): CatalogProduct => ({
      id: link.productId,
      kind: 'theme',
      unlocks: [link.themeId],
      fallbackPrice: SINGLE_THEME_PRICE,
    }),
  ),
  ...TIP_OPTIONS.map(
    (tip): CatalogProduct => ({ id: tip.productId, kind: 'tip', unlocks: [], fallbackPrice: `${tip.amount} ₴` }),
  ),
];

export const ADS_CONFIG: AdsConfig = {
  enabled: false,
  testing: true,
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  placements: ['looks', 'settings'],
  disableForPayingUsers: true,
};

export const STORAGE_KEYS = {
  counter: 'fc.counter',
  settings: 'fc.settings',
  entitlements: 'fc.entitlements',
} as const;

export const GOAL_PRESETS: readonly number[] = [10, 33, 50, 100, 108, 500, 1000];

export const ACCENT_PRESETS: readonly string[] = ['#ffd60a', '#39ff88', '#3ddcff', '#ff4fa3', '#ff8a3d', '#b58cff', '#f4f4f4'];

export const DEFAULT_ACCENT = '#ffd60a';

export const LIMITS = {
  undoDepth: 50,
  maxLaps: 99,
  maxAbsValue: 999_999_999,
  maxTimerMs: 99 * 3_600_000 + 59 * 60_000 + 59_000,
} as const;

export const NOTIFICATION_CHANNEL_ID = 'fc-goals';

export const TIMER_NOTIFICATION_ID = 1001;

export const ALERT_NOTIFICATION_ID = 1002;

export const SUPPORT_EMAIL = 'support@example.com';

export const PLAY_ORDERS_URL = 'https://play.google.com/store/account/orderhistory';

