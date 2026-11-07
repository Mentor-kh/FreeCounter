import { Injectable, signal } from '@angular/core';
import { Capacitor, PermissionState } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AndroidSettings, NativeSettings } from 'capacitor-native-settings';
import { PermissionsSnapshot, PermissionStatus } from '../models/settings.model';

function toStatus(state: PermissionState): PermissionStatus {
  switch (state) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'prompt':
    case 'prompt-with-rationale':
      return 'prompt';
  }
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly native = Capacitor.isNativePlatform();
  private readonly state = signal<PermissionsSnapshot>({
    notifications: 'prompt',
    exactAlarms: 'unavailable',
  });

  readonly snapshot = this.state.asReadonly();

  async refresh(): Promise<PermissionsSnapshot> {
    const notifications = await this.checkNotifications();
    const exactAlarms = await this.checkExactAlarms();
    this.state.set({ notifications, exactAlarms });
    return this.state();
  }

  async requestNotifications(): Promise<PermissionStatus> {
    try {
      const result = await LocalNotifications.requestPermissions();
      await this.refresh();
      return toStatus(result.display);
    } catch {
      return 'unavailable';
    }
  }

  async ensureNotifications(): Promise<boolean> {
    const current = await this.checkNotifications();
    if (current === 'granted') {
      return true;
    }
    if (current === 'prompt') {
      return (await this.requestNotifications()) === 'granted';
    }
    return false;
  }

  async openNotificationSettings(): Promise<void> {
    if (!this.native) {
      return;
    }
    await NativeSettings.openAndroid({ option: AndroidSettings.AppNotification }).catch(() =>
      NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails }),
    );
  }

  async openExactAlarmSettings(): Promise<void> {
    if (!this.native) {
      return;
    }
    try {
      await LocalNotifications.changeExactNotificationSetting();
    } finally {
      await this.refresh();
    }
  }

  private async checkNotifications(): Promise<PermissionStatus> {
    try {
      const result = await LocalNotifications.checkPermissions();
      return toStatus(result.display);
    } catch {
      return 'unavailable';
    }
  }

  private async checkExactAlarms(): Promise<PermissionStatus> {
    if (!this.native) {
      return 'unavailable';
    }
    try {
      const result = await LocalNotifications.checkExactNotificationSetting();
      return toStatus(result.exact_alarm);
    } catch {
      return 'unavailable';
    }
  }
}
