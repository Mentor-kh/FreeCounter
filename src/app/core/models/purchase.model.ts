import { ArtThemeId } from './theme.model';

export type ThemeProductId =
  | 'theme_psychedelic'
  | 'theme_latte'
  | 'theme_nebula'
  | 'theme_matcha'
  | 'theme_cyber'
  | 'theme_aurora';

export type PackProductId = 'pack_starter_promo' | 'pack_starter';

export type TipProductId = 'tip_25' | 'tip_50' | 'tip_75' | 'tip_100';

export type ProductId = ThemeProductId | PackProductId | TipProductId;

export type ProductKind = 'theme' | 'pack' | 'tip';

export interface CatalogProduct {
  readonly id: ProductId;
  readonly kind: ProductKind;
  readonly unlocks: readonly ArtThemeId[];
  readonly fallbackPrice: string;
}

export interface TipOption {
  readonly productId: TipProductId;
  readonly amount: number;
}

export interface StoreProductInfo {
  readonly id: ProductId;
  readonly price: string;
  readonly owned: boolean;
  readonly canPurchase: boolean;
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'failed' | 'unavailable';

export interface PurchaseResult {
  readonly outcome: PurchaseOutcome;
  readonly message?: string;
}

export type BillingStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface BillingSnapshot {
  readonly status: BillingStatus;
  readonly products: ReadonlyMap<ProductId, StoreProductInfo>;
}

export interface BillingProvider {
  readonly name: string;
  initialize(products: readonly CatalogProduct[], onChange: (snapshot: BillingSnapshot) => void): Promise<void>;
  purchase(product: CatalogProduct): Promise<PurchaseResult>;
  refresh(): Promise<void>;
}

export interface EntitlementsCache {
  readonly version: 2;
  readonly ownedProducts: readonly ProductId[];
  readonly supporter: boolean;
}
