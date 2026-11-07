import { inject, Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SettingsStore } from './settings.store';

export type HapticCue = 'tap' | 'soft' | 'heavy' | 'success' | 'warning';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly settings = inject(SettingsStore);

  fire(cue: HapticCue): void {
    if (!this.settings.settings().haptics) {
      return;
    }
    void this.run(cue).catch(() => undefined);
  }

  private run(cue: HapticCue): Promise<void> {
    switch (cue) {
      case 'tap':
        return Haptics.impact({ style: ImpactStyle.Light });
      case 'soft':
        return Haptics.selectionChanged();
      case 'heavy':
        return Haptics.impact({ style: ImpactStyle.Heavy });
      case 'success':
        return Haptics.notification({ type: NotificationType.Success });
      case 'warning':
        return Haptics.notification({ type: NotificationType.Warning });
    }
  }
}
