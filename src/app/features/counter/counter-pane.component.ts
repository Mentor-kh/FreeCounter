import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslationKey } from '@core/i18n/en';
import { I18nService } from '@core/i18n/i18n.service';
import { CounterMode, Lap } from '@core/models/counter.model';
import { VoiceStep } from '@core/models/settings.model';
import { elapsedMs, remainingMs, tapProgress, timerProgress } from '@core/services/counter-logic';
import { CounterStore } from '@core/services/counter.store';
import { FeedbackService } from '@core/services/feedback.service';
import { UiService } from '@core/services/ui.service';
import { VoiceService } from '@core/services/voice.service';
import { IconComponent, IconName } from '@shared/components/icon.component';
import { WheelComponent } from '@shared/components/wheel.component';
import { LongPressDirective } from '@shared/directives/long-press.directive';
import { formatDuration } from '@shared/pipes/duration.pipe';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { injectTicker } from '@shared/utils/ticker';
import { LoupeComponent } from './loupe.component';

interface LoupeView {
  readonly value: string;
  readonly fraction: string | null;
  readonly caption: string | null;
  readonly progress: number | null;
}

type TimePart = 'h' | 'm' | 's';

interface TimeParts {
  readonly h: number;
  readonly m: number;
  readonly s: number;
}

const MODE_ICONS: Readonly<Record<CounterMode, IconName>> = { tap: 'tap', stopwatch: 'stopwatch', timer: 'timer' };
const MODE_LABELS: Readonly<Record<CounterMode, TranslationKey>> = {
  tap: 'mode.tap',
  stopwatch: 'mode.stopwatch',
  timer: 'mode.timer',
};
const MODES: readonly CounterMode[] = ['tap', 'stopwatch', 'timer'];

interface StepOption {
  readonly step: VoiceStep;
  readonly label: TranslationKey;
}

const STEP_OPTIONS: readonly StepOption[] = [
  { step: 1, label: 'voice.every1' },
  { step: 10, label: 'voice.every10' },
];

function scaleFor(text: string): number {
  const length = text.length;
  return length <= 3 ? 1 : Math.max(0.42, 1 - (length - 3) * 0.12);
}

@Component({
  selector: 'app-counter-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoupeComponent, WheelComponent, LongPressDirective, TranslatePipe],
  templateUrl: './counter-pane.component.html',
  styleUrl: './counter-pane.component.scss',
})
export class CounterPaneComponent {
  protected readonly store = inject(CounterStore);
  protected readonly ui = inject(UiService);
  private readonly feedback = inject(FeedbackService);
  private readonly i18n = inject(I18nService);
  protected readonly voice = inject(VoiceService);

  protected readonly modes = MODES;
  protected readonly stepOptions = STEP_OPTIONS;
  protected readonly voiceMenu = signal<boolean>(false);
  protected readonly mode = this.store.mode;
  protected readonly tap = this.store.tapState;
  protected readonly modeIcon = computed<IconName>(() => MODE_ICONS[this.mode()]);
  protected readonly modeLabel = computed<TranslationKey>(() => MODE_LABELS[this.mode()]);
  protected readonly backgroundRunning = computed<boolean>(
    () =>
      (this.mode() !== 'timer' && this.store.timerRunning()) ||
      (this.mode() !== 'stopwatch' && this.store.stopwatchRunning()),
  );

  private readonly stopwatchNow = injectTicker(
    computed(() => this.mode() === 'stopwatch' && this.store.stopwatchRunning()),
    33,
  );
  private readonly timerNow = injectTicker(
    computed(() => this.mode() === 'timer' && this.store.timerRunning()),
    200,
  );

  protected readonly view = computed<LoupeView>(() => {
    switch (this.mode()) {
      case 'tap':
        return this.tapView();
      case 'stopwatch':
        return this.stopwatchView();
      case 'timer':
        return this.timerView();
    }
  });
  protected readonly scale = computed<number>(() => scaleFor(this.view().value));
  protected readonly lastLap = computed<Lap | null>(() => this.store.stopwatch().laps[0] ?? null);
  protected readonly timerParts = computed<TimeParts>(() => {
    const total = Math.round(this.store.timer().durationMs / 1000);
    return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
  });
  protected readonly timerLocked = computed<boolean>(() => this.store.timerRunning());

  protected cycleMode(): void {
    this.store.cycleMode();
    this.feedback.toggle();
  }

  protected onLoupe(): void {
    if (this.mode() === 'tap') {
      this.store.tap();
      this.feedback.tap();
      this.voice.sayNumber(this.tap().value);
    } else {
      this.store.toggleRun();
    }
  }

  protected toggleDirection(): void {
    this.store.toggleDirection();
    this.feedback.toggle();
  }

  protected undo(): void {
    this.store.undo();
    this.feedback.toggle();
    this.voice.sayNumber(this.tap().value);
  }

  protected toggleVoice(): void {
    const enabled = this.voice.toggle();
    this.ui.showToast(this.i18n.t(enabled ? 'voice.on' : 'voice.off'));
  }

  protected openVoiceMenu(): void {
    this.voiceMenu.set(true);
    this.feedback.toggle();
  }

  protected pickStep(step: VoiceStep): void {
    this.voice.setStep(step);
    this.voiceMenu.set(false);
    this.feedback.toggle();
  }

  protected toggleGender(): void {
    const gender = this.voice.toggleGender();
    this.ui.showToast(this.i18n.t(gender === 'male' ? 'voice.male' : 'voice.female'));
  }

  protected lap(): void {
    this.store.lap();
  }

  protected tick(): void {
    this.feedback.tick();
  }

  protected setPart(part: TimePart, value: number): void {
    const parts = { ...this.timerParts(), [part]: value };
    this.store.setTimerDuration((parts.h * 3600 + parts.m * 60 + parts.s) * 1000, false);
  }

  protected reset(): void {
    if (this.store.reset()) {
      this.ui.showToast(this.i18n.t('counter.resetDone'), 'info', {
        label: this.i18n.t('common.undo'),
        run: () => this.store.restoreReset(),
      });
    }
  }

  protected formatValue(value: number): string {
    return this.i18n.formatNumber(value);
  }

  protected formatLap(ms: number): string {
    return formatDuration(ms, 'precise');
  }

  private tapView(): LoupeView {
    const tap = this.tap();
    let caption: string | null = null;
    if (tap.goal !== null && tap.goal !== tap.start) {
      caption = tap.goalReached
        ? this.i18n.t('counter.goalReached')
        : this.i18n.t('counter.toGo', { value: this.i18n.formatNumber(Math.abs(tap.goal - tap.value)) });
    }
    return { value: this.i18n.formatNumber(tap.value), fraction: null, caption, progress: tapProgress(tap) };
  }

  private stopwatchView(): LoupeView {
    const stopwatch = this.store.stopwatch();
    const elapsed = elapsedMs(stopwatch, this.stopwatchNow());
    const precise = formatDuration(elapsed, 'precise');
    const dot = precise.lastIndexOf('.');
    let caption: string | null = null;
    if (stopwatch.startedAt === null) {
      caption = this.i18n.t(elapsed === 0 ? 'counter.tapToStart' : 'counter.paused');
    } else if (stopwatch.laps.length > 0) {
      caption = this.i18n.t('counter.lapN', { value: stopwatch.laps.length + 1 });
    }
    return {
      value: precise.slice(0, dot),
      fraction: precise.slice(dot),
      caption,
      progress: elapsed === 0 ? null : (elapsed % 60_000) / 60_000,
    };
  }

  private timerView(): LoupeView {
    const timer = this.store.timer();
    const now = this.timerNow();
    let caption: string | null = null;
    if (timer.finished) {
      caption = this.i18n.t('counter.timerDone');
    } else if (timer.startedAt === null && timer.durationMs > 0) {
      caption = this.i18n.t(timer.accumulatedMs === 0 ? 'counter.tapToStart' : 'counter.paused');
    }
    return {
      value: formatDuration(remainingMs(timer, now)),
      fraction: null,
      caption,
      progress: timer.durationMs > 0 ? timerProgress(timer, now) : null,
    };
  }
}
