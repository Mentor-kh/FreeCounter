import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../i18n/i18n.service';
import { CounterEvent } from '../models/counter.model';
import { CounterStore } from './counter.store';
import { HapticsService } from './haptics.service';
import { NotificationService } from './notification.service';
import { SettingsStore } from './settings.store';
import { SoundService } from './sound.service';
import { UiService } from './ui.service';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly counter = inject(CounterStore);
  private readonly sound = inject(SoundService);
  private readonly haptics = inject(HapticsService);
  private readonly notifications = inject(NotificationService);
  private readonly settings = inject(SettingsStore);
  private readonly ui = inject(UiService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private appActive = true;

  start(): void {
    this.counter.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.handle(event));
  }

  setAppActive(active: boolean): void {
    this.appActive = active;
  }

  tap(): void {
    this.sound.play('tap');
    this.haptics.fire('tap');
  }

  tick(): void {
    this.sound.play('tap');
    this.haptics.fire('soft');
  }

  toggle(): void {
    this.sound.play('toggle');
    this.haptics.fire('soft');
  }

  private handle(event: CounterEvent): void {
    switch (event.kind) {
      case 'goal':
        this.finish(this.i18n.t('counter.goalReached'), this.i18n.formatNumber(this.counter.tapState().value));
        break;
      case 'timerFinished':
        if (this.appActive) {
          this.finish(this.i18n.t('counter.timerDone'), this.i18n.t('counter.timerDoneHint'));
        }
        break;
      case 'started':
        this.sound.play('start');
        this.haptics.fire('soft');
        break;
      case 'paused':
        this.haptics.fire('soft');
        break;
      case 'reset':
        this.sound.play('reset');
        this.haptics.fire('heavy');
        break;
      case 'lap':
        this.sound.play('lap');
        this.haptics.fire('tap');
        break;
    }
  }

  private finish(title: string, subtitle: string): void {
    this.haptics.fire('success');
    this.ui.celebrate(title, subtitle);
    void this.playAlert(title, subtitle);
  }

  private async playAlert(title: string, subtitle: string): Promise<void> {
    const sound = this.settings.sound();
    if (sound.enabled && sound.alert === 'system' && (await this.notifications.alertNow(title, subtitle))) {
      return;
    }
    this.sound.play('finish');
  }
}
