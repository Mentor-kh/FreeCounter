import {
  BillingProvider,
  BillingSnapshot,
  CatalogProduct,
  ProductId,
  PurchaseResult,
  StoreProductInfo,
} from '../models/purchase.model';

const MOCK_DELAY_MS = 700;
const MOCK_STORAGE_KEY = 'fc.mock-owned';

function readMockOwned(): ProductId[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is ProductId => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export class MockBillingProvider implements BillingProvider {
  readonly name = 'mock';
  private readonly owned = new Set<ProductId>(readMockOwned());
  private catalog: readonly CatalogProduct[] = [];
  private onChange: (snapshot: BillingSnapshot) => void = () => undefined;

  async initialize(products: readonly CatalogProduct[], onChange: (snapshot: BillingSnapshot) => void): Promise<void> {
    this.catalog = products;
    this.onChange = onChange;
    await this.delay();
    this.emit();
  }

  async purchase(product: CatalogProduct): Promise<PurchaseResult> {
    await this.delay();
    if (product.kind !== 'tip') {
      this.owned.add(product.id);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify([...this.owned]));
    }
    this.emit();
    return { outcome: 'purchased' };
  }

  async refresh(): Promise<void> {
    this.emit();
  }

  private emit(): void {
    const products = new Map<ProductId, StoreProductInfo>(
      this.catalog.map((item) => [
        item.id,
        { id: item.id, price: item.fallbackPrice, owned: this.owned.has(item.id), canPurchase: !this.owned.has(item.id) },
      ]),
    );
    this.onChange({ status: 'ready', products });
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  }
}

export class UnavailableBillingProvider implements BillingProvider {
  readonly name = 'unavailable';

  async initialize(_products: readonly CatalogProduct[], onChange: (snapshot: BillingSnapshot) => void): Promise<void> {
    onChange({ status: 'unavailable', products: new Map() });
  }

  async purchase(): Promise<PurchaseResult> {
    return { outcome: 'unavailable' };
  }

  async refresh(): Promise<void> {
    return;
  }
}

export class FreeWebBillingProvider implements BillingProvider {
  readonly name = 'free-web';

  async initialize(products: readonly CatalogProduct[], onChange: (snapshot: BillingSnapshot) => void): Promise<void> {
    const owned = new Map<ProductId, StoreProductInfo>(
      products
        .filter((item) => item.kind !== 'tip')
        .map((item) => [item.id, { id: item.id, price: item.fallbackPrice, owned: true, canPurchase: false }]),
    );
    onChange({ status: 'ready', products: owned });
  }

  async purchase(): Promise<PurchaseResult> {
    return { outcome: 'unavailable' };
  }

  async refresh(): Promise<void> {
    return;
  }
}
