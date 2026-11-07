import {
  BillingProvider,
  BillingSnapshot,
  CatalogProduct,
  ProductId,
  PurchaseResult,
  StoreProductInfo,
} from '../models/purchase.model';

const DEVICE_READY_TIMEOUT_MS = 8000;
const PURCHASE_SETTLE_TIMEOUT_MS = 60_000;

type Cdv = typeof CdvPurchase;

interface PendingOrder {
  readonly productId: ProductId;
  readonly resolve: (result: PurchaseResult) => void;
}

function waitForDeviceReady(): Promise<void> {
  return new Promise((resolve) => {
    if (window.CdvPurchase?.store !== undefined) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, DEVICE_READY_TIMEOUT_MS);
    document.addEventListener(
      'deviceready',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export class PlayBillingProvider implements BillingProvider {
  readonly name = 'google-play';
  private cdv: Cdv | null = null;
  private catalog: readonly CatalogProduct[] = [];
  private onChange: (snapshot: BillingSnapshot) => void = () => undefined;
  private ready = false;
  private pendingOrder: PendingOrder | null = null;

  /**
   * @description Registers all catalog products with Google Play Billing, wires transaction listeners
   * and resolves once local receipts (owned purchases) are loaded.
   * @param products Products to register.
   * @param onChange Callback receiving a fresh snapshot whenever products or ownership change.
   */
  async initialize(products: readonly CatalogProduct[], onChange: (snapshot: BillingSnapshot) => void): Promise<void> {
    this.catalog = products;
    this.onChange = onChange;
    this.onChange({ status: 'loading', products: new Map() });
    await waitForDeviceReady();
    const cdv = window.CdvPurchase;
    if (cdv?.store === undefined) {
      this.onChange({ status: 'unavailable', products: new Map() });
      return;
    }
    this.cdv = cdv;
    const { store, Platform, ProductType, LogLevel } = cdv;
    store.verbosity = LogLevel.WARNING;
    store.register(
      products.map((p) => ({
        id: p.id,
        type: p.kind === 'tip' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
        platform: Platform.GOOGLE_PLAY,
      })),
    );
    store
      .when()
      .productUpdated(() => this.emit())
      .approved((transaction) => void transaction.finish())
      .pending((transaction) => this.settle(transaction, { outcome: 'pending' }))
      .finished((transaction) => {
        this.settle(transaction, { outcome: 'purchased' });
        this.emit();
      })
      .receiptsReady(() => {
        this.ready = true;
        this.emit();
      });
    store.error((error) => {
      if (this.pendingOrder !== null && error.productId === this.pendingOrder.productId) {
        this.resolvePending({
          outcome: error.code === cdv.ErrorCode.PAYMENT_CANCELLED ? 'cancelled' : 'failed',
          message: error.message,
        });
      }
    });
    const errors = await store.initialize([Platform.GOOGLE_PLAY]);
    if (errors.some((e) => e.code === cdv.ErrorCode.SETUP)) {
      this.onChange({ status: 'unavailable', products: new Map() });
    }
  }

  async purchase(product: CatalogProduct): Promise<PurchaseResult> {
    const productId = product.id;
    const cdv = this.cdv;
    const offer = cdv?.store.get(productId, cdv.Platform.GOOGLE_PLAY)?.getOffer();
    if (cdv === null || offer === undefined) {
      return { outcome: 'unavailable' };
    }
    this.resolvePending({ outcome: 'cancelled' });
    const settled = new Promise<PurchaseResult>((resolve) => {
      this.pendingOrder = { productId, resolve };
    });
    const timeout = new Promise<PurchaseResult>((resolve) =>
      setTimeout(() => resolve({ outcome: product.kind !== 'tip' && cdv.store.owned(productId) ? 'purchased' : 'pending' }), PURCHASE_SETTLE_TIMEOUT_MS),
    );
    const error = await offer.order();
    if (error !== undefined) {
      const outcome = error.code === cdv.ErrorCode.PAYMENT_CANCELLED ? 'cancelled' : 'failed';
      this.resolvePending({ outcome, message: error.message });
    }
    return Promise.race([settled, timeout]);
  }

  async refresh(): Promise<void> {
    if (this.cdv === null) {
      return;
    }
    await this.cdv.store.update();
    this.emit();
  }

  private settle(transaction: CdvPurchase.Transaction, result: PurchaseResult): void {
    const order = this.pendingOrder;
    if (order !== null && transaction.products.some((p) => p.id === order.productId)) {
      this.resolvePending(result);
    }
  }

  private resolvePending(result: PurchaseResult): void {
    const order = this.pendingOrder;
    this.pendingOrder = null;
    order?.resolve(result);
  }

  private emit(): void {
    const cdv = this.cdv;
    if (cdv === null) {
      return;
    }
    const products = new Map<ProductId, StoreProductInfo>();
    for (const item of this.catalog) {
      const product = cdv.store.get(item.id, cdv.Platform.GOOGLE_PLAY);
      products.set(item.id, {
        id: item.id,
        price: product?.pricing?.price ?? item.fallbackPrice,
        owned: cdv.store.owned({ id: item.id, platform: cdv.Platform.GOOGLE_PLAY }),
        canPurchase: product?.canPurchase ?? false,
      });
    }
    this.onChange({ status: this.ready ? 'ready' : 'loading', products });
  }
}
