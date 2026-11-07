import { computed, inject, Injectable, isDevMode, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PRODUCT_CATALOG, PROMO_END_DATE, STORAGE_KEYS, THEME_PRODUCTS, WEB_THEMES_FREE } from '../config/app.constants';
import {
  BillingProvider,
  BillingStatus,
  CatalogProduct,
  EntitlementsCache,
  PackProductId,
  ProductId,
  PurchaseResult,
  StoreProductInfo,
  ThemeProductId,
} from '../models/purchase.model';
import { ArtThemeId } from '../models/theme.model';
import { FreeWebBillingProvider, MockBillingProvider, UnavailableBillingProvider } from '../providers/mock-billing.provider';
import { PlayBillingProvider } from '../providers/play-billing.provider';
import { isRecord, readArray, readBoolean } from './sanitize';
import { StorageService } from './storage.service';

const PRODUCT_IDS: ReadonlySet<string> = new Set(PRODUCT_CATALOG.map((p) => p.id));

function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && PRODUCT_IDS.has(value);
}

function createProvider(): BillingProvider {
  if (Capacitor.getPlatform() === 'android') {
    return new PlayBillingProvider();
  }
  if (isDevMode()) {
    return new MockBillingProvider();
  }
  return WEB_THEMES_FREE ? new FreeWebBillingProvider() : new UnavailableBillingProvider();
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly storage = inject(StorageService);
  private readonly provider = createProvider();
  private readonly ownedState = signal<ReadonlySet<ProductId>>(new Set());
  private readonly supporterState = signal<boolean>(false);
  private readonly productsState = signal<ReadonlyMap<ProductId, StoreProductInfo>>(new Map());
  private readonly statusState = signal<BillingStatus>('idle');
  private readonly busyState = signal<ProductId | null>(null);
  private readonly nowState = signal<number>(Date.now());

  readonly status = this.statusState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly supporter = this.supporterState.asReadonly();
  readonly promoActive = computed<boolean>(() => this.nowState() < PROMO_END_DATE.getTime());
  readonly packProductId = computed<PackProductId>(() => (this.promoActive() ? 'pack_starter_promo' : 'pack_starter'));
  readonly hasAnyPurchase = computed<boolean>(() => this.ownedState().size > 0 || this.supporterState());
  readonly unlockedThemes = computed<ReadonlySet<ArtThemeId>>(() => {
    const owned = this.ownedState();
    const unlocked = new Set<ArtThemeId>();
    for (const product of PRODUCT_CATALOG) {
      if (owned.has(product.id)) {
        product.unlocks.forEach((theme) => unlocked.add(theme));
      }
    }
    return unlocked;
  });
  readonly packOwned = computed<boolean>(() => {
    const unlocked = this.unlockedThemes();
    return this.product(this.packProductId()).unlocks.every((theme) => unlocked.has(theme));
  });

  async loadCache(): Promise<void> {
    const cache = await this.storage.read(STORAGE_KEYS.entitlements, (raw) => this.sanitizeCache(raw));
    if (cache !== null) {
      this.ownedState.set(new Set(cache.ownedProducts));
      this.supporterState.set(cache.supporter);
    }
  }

  async initialize(): Promise<void> {
    await this.provider.initialize(PRODUCT_CATALOG, (snapshot) => {
      this.statusState.set(snapshot.status);
      this.productsState.set(snapshot.products);
      if (snapshot.status === 'ready') {
        const owned = new Set<ProductId>(
          [...snapshot.products.values()].filter((p) => p.owned && this.product(p.id).kind !== 'tip').map((p) => p.id),
        );
        this.ownedState.set(owned);
        void this.saveCache();
      }
    });
  }

  refresh(): Promise<void> {
    this.nowState.set(Date.now());
    return this.provider.refresh().catch(() => undefined);
  }

  isUnlocked(themeId: ArtThemeId): boolean {
    return this.unlockedThemes().has(themeId);
  }

  productForTheme(themeId: ArtThemeId): ThemeProductId | null {
    return THEME_PRODUCTS.find((link) => link.themeId === themeId)?.productId ?? null;
  }

  price(productId: ProductId): string {
    return this.productsState().get(productId)?.price ?? this.product(productId).fallbackPrice;
  }

  async buy(productId: ProductId): Promise<PurchaseResult> {
    if (this.busyState() !== null) {
      return { outcome: 'cancelled' };
    }
    const product = this.product(productId);
    this.busyState.set(productId);
    try {
      const result = await this.provider.purchase(product);
      if (result.outcome === 'purchased' && product.kind === 'tip') {
        this.supporterState.set(true);
        await this.saveCache();
      }
      return result;
    } catch {
      return { outcome: 'failed' };
    } finally {
      this.busyState.set(null);
    }
  }

  private product(productId: ProductId): CatalogProduct {
    const product = PRODUCT_CATALOG.find((p) => p.id === productId);
    if (product === undefined) {
      throw new Error(`Unknown product ${productId}`);
    }
    return product;
  }

  private saveCache(): Promise<void> {
    return this.storage.write<EntitlementsCache>(STORAGE_KEYS.entitlements, {
      version: 2,
      ownedProducts: [...this.ownedState()],
      supporter: this.supporterState(),
    });
  }

  private sanitizeCache(raw: unknown): EntitlementsCache | null {
    if (!isRecord(raw)) {
      return null;
    }
    return {
      version: 2,
      ownedProducts: readArray(raw, 'ownedProducts').filter(isProductId),
      supporter: readBoolean(raw, 'supporter', false),
    };
  }
}
