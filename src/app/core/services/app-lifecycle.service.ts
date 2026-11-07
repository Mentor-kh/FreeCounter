import { effect, inject, Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { AdsService } from './ads.service';
import { CounterStore } from './counter.store';
import { FeedbackService } from './feedback.service';
import { NotificationService } from './notification.service';
import { PagerService } from './pager.service';
import { PermissionsService } from './permissions.service';
import { PurchaseService } from './purchase.service';
import { SettingsStore } from './settings.store';
import { ThemeService } from './theme.service';
import { UiService } from './ui.service';

@Injectable({ providedIn: 'root' })
export class AppLifecycleService {
  private readonly settings = inject(SettingsStore);
  private readonly counter = inject(CounterStore);
  private readonly purchases = inject(PurchaseService);
  private readonly themes = inject(ThemeService);
  private readonly notifications = inject(NotificationService);
  private readonly permissions = inject(PermissionsService);
  private readonly feedback = inject(FeedbackService);
  private readonly ads = inject(AdsService);
  private readonly pager = inject(PagerService);
  private readonly ui = inject(UiService);

  constructor() {
    effect(() => void this.syncKeepAwake(this.settings.settings().keepAwake));
    effect(() => {
      const pane = this.pager.pane();
      void (pane === 'counter' ? this.ads.hide() : this.ads.show(pane));
    });
  }

  /**
   * @description Restores persisted state before the first render so the user sees the last value
   * and the chosen look immediately, without flicker.
   */
  async bootstrap(): Promise<void> {
    await Promise.all([this.settings.load(), this.counter.load(), this.purchases.loadCache()]);
    this.themes.tokens();
    this.feedback.start();
  }

  /**
   * @description Starts background services (billing, notifications, ads) and native listeners after the
   * first render, then hides the splash screen.
   */
  async start(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
      await this.registerNativeListeners();
    } else {
      this.registerWebListeners();
    }
    await Promise.allSettled([
      this.notifications.initialize(),
      this.permissions.refresh(),
      this.purchases.initialize(),
      this.ads.initialize(),
    ]);
  }

  private async registerNativeListeners(): Promise<void> {
    await App.addListener('appStateChange', ({ isActive }) => void this.onActiveChange(isActive));
    await App.addListener('backButton', () => void this.onBack());
  }

  private registerWebListeners(): void {
    document.addEventListener('visibilitychange', () => {
      void this.onActiveChange(document.visibilityState === 'visible');
    });
  }

  private async syncKeepAwake(enabled: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    await (enabled ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => undefined);
  }

  private async onActiveChange(active: boolean): Promise<void> {
    this.feedback.setAppActive(active);
    if (active) {
      this.counter.checkTimer(false);
      await this.notifications.cancelScheduled();
      await this.permissions.refresh();
      await this.purchases.refresh();
    } else {
      await this.counter.flush();
      await this.notifications.scheduleBackgroundAlerts();
    }
  }

  private async onBack(): Promise<void> {
    if (this.ui.closeTopOverlay()) {
      return;
    }
    if (!this.pager.isHome()) {
      this.pager.goHome();
      return;
    }
    await this.counter.flush();
    await App.minimizeApp();
  }
}
