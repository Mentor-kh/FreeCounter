import { TranslationKey } from '@core/i18n/en';
import { PurchaseOutcome } from '@core/models/purchase.model';

export function purchaseMessageKey(outcome: PurchaseOutcome): TranslationKey {
  switch (outcome) {
    case 'purchased':
      return 'purchase.purchased';
    case 'pending':
      return 'purchase.pending';
    case 'unavailable':
      return 'purchase.unavailable';
    case 'cancelled':
    case 'failed':
      return 'purchase.failed';
  }
}
