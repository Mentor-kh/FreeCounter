import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ALERT_NOTIFICATION_ID, NOTIFICATION_CHANNEL_ID, TIMER_NOTIFICATION_ID } from '../config/app.constants';
import { I18nService } from '../i18n/i18n.service';
import { remainingMs } from './counter-logic';
import { CounterStore } from './counter.store';
import { PermissionsService } from './permissions.service';
import { SettingsStore } from './settings.store';

const MIN_LEAD_MS = 1500;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly counter = inject(CounterStore);
  private readonly settings = inject(SettingsStore);
  private readonly permissions = inject(PermissionsService);
  private readonly i18n = inject(I18nService);

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: this.i18n.t('settings.channelName'),
      description: 'Timer finished alerts',
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => undefined);
    await this.cancelScheduled();
  }

  /**
   * @description Schedules a system notification for the running timer so it rings while the app
   * is in the background or closed. Called when the app goes to background.
   */
  async scheduleBackgroundAlerts(): Promise<void> {
    const timer = this.counter.timer();
    const now = Date.now();
    if (!this.settings.settings().notifications || timer.startedAt === null || remainingMs(timer, now) <= MIN_LEAD_MS) {
      return;
    }
    if ((await this.permissions.refresh()).notifications !== 'granted') {
      return;
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TIMER_NOTIFICATION_ID,
          title: this.i18n.t('counter.timerDone'),
          body: this.i18n.t('counter.timerDoneHint'),
          channelId: NOTIFICATION_CHANNEL_ID,
          schedule: { at: new Date(now + remainingMs(timer, now)), allowWhileIdle: true },
          autoCancel: true,
        },
      ],
    }).catch(() => undefined);
  }

  /**
   * @description Posts an immediate notification on the timer channel so the phone plays the alert sound
   * the user picked in system settings. Used instead of the synthesized finish sound.
   * @param title Notification title.
   * @param body Notification text.
   * @returns True when the system notification was posted.
   */
  async alertNow(title: string, body: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || this.permissions.snapshot().notifications !== 'granted') {
      return false;
    }
    try {
      await LocalNotifications.schedule({
        notifications: [{ id: ALERT_NOTIFICATION_ID, title, body, channelId: NOTIFICATION_CHANNEL_ID, autoCancel: true }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async cancelScheduled(): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] }).catch(() => undefined);
  }
}
