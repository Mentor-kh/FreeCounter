import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { APP_VERSION } from '@core/config/version';
import { Capacitor } from '@capacitor/core';
import { AlertSound, Language } from '@core/models/settings.model';
import { AdsService } from '@core/services/ads.service';
import { UiService } from '@core/services/ui.service';
import { PermissionsService } from '@core/services/permissions.service';
import { SettingsStore } from '@core/services/settings.store';
import { SoundService } from '@core/services/sound.service';
import { IconComponent } from '@shared/components/icon.component';
import { ToggleComponent } from '@shared/components/toggle.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { DonateComponent, donateMode } from './donate.component';

interface LanguageOption {
  readonly id: Language;
  readonly label: string;
}

@Component({
  selector: 'app-settings-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ToggleComponent, TranslatePipe, DonateComponent],
  templateUrl: './settings-pane.component.html',
  styleUrl: './settings-pane.component.scss',
})
export class SettingsPaneComponent {
  protected readonly store = inject(SettingsStore);
  protected readonly permissions = inject(PermissionsService);
  protected readonly ads = inject(AdsService);
  protected readonly ui = inject(UiService);
  protected readonly native = Capacitor.isNativePlatform();
  protected readonly showDonate = donateMode() !== 'none';
  private readonly sound = inject(SoundService);

  protected readonly version = APP_VERSION;
  protected readonly languages: readonly LanguageOption[] = [
    { id: 'en', label: 'English' },
    { id: 'ru', label: 'Русский' },
  ];
  protected readonly s = this.store.settings;
  protected readonly volumePercent = computed<number>(() => Math.round(this.s().sound.volume * 100));
  protected readonly notificationsBlocked = computed<boolean>(
    () => this.s().notifications && this.permissions.snapshot().notifications === 'denied',
  );
  protected readonly exactAlarmsOff = computed<boolean>(
    () => this.s().notifications && this.permissions.snapshot().exactAlarms === 'denied',
  );

  protected setSound(enabled: boolean): void {
    this.store.updateSound({ enabled });
    if (enabled) {
      this.sound.play('start', true);
    }
  }

  protected setTapSound(onTap: boolean): void {
    this.store.updateSound({ onTap });
    if (onTap) {
      this.sound.play('tap', true);
    }
  }

  protected setVolume(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.store.updateSound({ volume: Number(event.target.value) / 100 });
    }
  }

  protected async setAlert(alert: AlertSound): Promise<void> {
    this.store.updateSound({ alert });
    if (alert === 'system') {
      await this.permissions.ensureNotifications();
    } else {
      this.sound.play('finish', true);
    }
  }

  protected previewVolume(): void {
    this.sound.play('tap', true);
  }

  protected async setNotifications(enabled: boolean): Promise<void> {
    this.store.update({ notifications: enabled });
    if (enabled) {
      await this.permissions.ensureNotifications();
    }
  }
}
