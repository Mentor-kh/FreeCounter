import { computed, effect, inject, Injectable } from '@angular/core';
import { QueueStrategy, SpeechSynthesisVoice, TextToSpeech } from '@capacitor-community/text-to-speech';
import { I18nService } from '../i18n/i18n.service';
import { VoiceGender, VoiceStep } from '../models/settings.model';
import { elapsedMs, remainingMs } from './counter-logic';
import { CounterStore } from './counter.store';
import { SettingsStore } from './settings.store';

const WATCH_MS = 250;
const COUNTDOWN_FROM = 59;
const EVERY_SECOND_FROM = 10;
const TAP_SETTLE_MS = 200;
const VOICES_REFETCH_MS = 5000;
const MALE_PITCH = 0.72;
const MALE_HINT = /\bmale\b|pavel|dmitr|maxim|yuri|david|mark|guy|ryan|andrew|brian|christopher|eric|roger|george|james|daniel/i;
const FEMALE_HINT = /female|irina|svetlana|dariya|milena|katya|zira|aria|jenny|samantha|michelle|emma|susan|hazel|karen/i;

interface VoiceChoice {
  readonly index: number | undefined;
  readonly pitch: number;
}

/**
 * @description Decides whether a timer second should be spoken during the countdown.
 * @param second Seconds left (rounded up).
 * @param step 1 to speak every second of the last minute, 10 to speak every tenth second.
 * @returns True when the second must be announced as a number.
 */
export function isCountdownSecond(second: number, step: VoiceStep): boolean {
  if (second <= 0 || second > COUNTDOWN_FROM) {
    return false;
  }
  return second <= EVERY_SECOND_FROM || second % step === 0;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly settings = inject(SettingsStore);
  private readonly counter = inject(CounterStore);
  private readonly i18n = inject(I18nService);
  private voices: readonly SpeechSynthesisVoice[] = [];
  private voicesFetchedAt = 0;
  private choiceCache: { readonly key: string; readonly choice: VoiceChoice } | null = null;
  private watchHandle: ReturnType<typeof setInterval> | null = null;
  private tapHandle: ReturnType<typeof setTimeout> | null = null;
  private lastSpoken = '';
  private lastTimerSecond = -1;
  private lastStopwatchMinute = -1;

  readonly enabled = computed<boolean>(() => this.settings.voice().enabled);
  readonly gender = computed<VoiceGender>(() => this.settings.voice().gender);
  readonly step = computed<VoiceStep>(() => this.settings.voice().step);

  constructor() {
    effect(() => {
      const active = this.enabled() && (this.counter.timerRunning() || this.counter.stopwatchRunning());
      this.syncWatcher(active);
    });
    effect(() => {
      if (this.enabled()) {
        void this.refreshVoices();
      }
    });
  }

  toggle(): boolean {
    const enabled = !this.enabled();
    this.settings.updateVoice({ enabled });
    if (enabled) {
      this.speak(this.i18n.t('voice.on'), true);
    } else {
      this.cancelTap();
      void TextToSpeech.stop().catch(() => undefined);
    }
    return enabled;
  }

  /**
   * @description Switches between a female and a male voice, turns announcements on and says a short sample.
   * @returns The new gender.
   */
  toggleGender(): VoiceGender {
    const gender: VoiceGender = this.gender() === 'female' ? 'male' : 'female';
    this.settings.updateVoice({ enabled: true, gender });
    this.speak(this.i18n.t('voice.sample'), true);
    return gender;
  }

  setStep(step: VoiceStep): void {
    this.settings.updateVoice({ step });
  }

  /**
   * @description Speaks the counter value once tapping pauses, so fast tapping never queues speech
   * and the UI thread is not blocked by repeated speech engine calls.
   * @param value Current counter value.
   */
  sayNumber(value: number): void {
    if (!this.enabled()) {
      return;
    }
    this.cancelTap();
    this.tapHandle = setTimeout(() => {
      this.tapHandle = null;
      this.speak(String(value));
    }, TAP_SETTLE_MS);
  }

  private cancelTap(): void {
    if (this.tapHandle !== null) {
      clearTimeout(this.tapHandle);
      this.tapHandle = null;
    }
  }

  private speak(text: string, force = false): void {
    if (!force && (!this.enabled() || text === this.lastSpoken)) {
      return;
    }
    this.lastSpoken = force ? '' : text;
    const choice = this.currentChoice();
    void TextToSpeech.speak({
      text,
      lang: this.i18n.locale(),
      rate: 1.05,
      pitch: choice.pitch,
      volume: 1,
      voice: choice.index,
      queueStrategy: QueueStrategy.Flush,
    })
      .catch(() => undefined)
      .finally(() => {
        if (this.lastSpoken === text) {
          this.lastSpoken = '';
        }
      });
  }

  private currentChoice(): VoiceChoice {
    if (this.voices.length === 0 && Date.now() - this.voicesFetchedAt > VOICES_REFETCH_MS) {
      void this.refreshVoices();
    }
    const key = `${this.i18n.language()}|${this.gender()}|${this.voices.length}`;
    if (this.choiceCache?.key !== key) {
      this.choiceCache = { key, choice: this.pickVoice(this.gender()) };
    }
    return this.choiceCache.choice;
  }

  private async refreshVoices(): Promise<void> {
    if (this.voices.length > 0) {
      return;
    }
    this.voicesFetchedAt = Date.now();
    try {
      this.voices = (await TextToSpeech.getSupportedVoices()).voices;
    } catch {
      this.voices = [];
    }
  }

  /**
   * @description Finds an installed voice of the requested gender by its name. Android does not report
   * the gender of a voice, so when nothing matches the default voice is used and the pitch is shifted.
   * @param gender Requested gender.
   * @returns Index of the voice in the full list (undefined for the default one) and the pitch to use.
   */
  private pickVoice(gender: VoiceGender): VoiceChoice {
    const language = this.i18n.language();
    const hint = gender === 'male' ? MALE_HINT : FEMALE_HINT;
    const index = this.voices.findIndex(
      (voice) =>
        voice.lang.toLowerCase().replace('_', '-').startsWith(language) &&
        hint.test(voice.name) &&
        !(gender === 'male' && FEMALE_HINT.test(voice.name)),
    );
    if (index >= 0) {
      return { index, pitch: 1 };
    }
    return { index: undefined, pitch: gender === 'male' ? MALE_PITCH : 1 };
  }

  private syncWatcher(active: boolean): void {
    if (active && this.watchHandle === null) {
      this.watchHandle = setInterval(() => this.announce(), WATCH_MS);
    } else if (!active && this.watchHandle !== null) {
      clearInterval(this.watchHandle);
      this.watchHandle = null;
      this.lastTimerSecond = -1;
      this.lastStopwatchMinute = -1;
    }
  }

  /**
   * @description Speaks running clocks: every full minute of the timer and of the stopwatch, and the timer's
   * last minute every second or every ten seconds (the last ten seconds are always spoken one by one).
   */
  private announce(): void {
    const now = Date.now();
    const timer = this.counter.timer();
    if (timer.startedAt !== null) {
      const second = Math.ceil(remainingMs(timer, now) / 1000);
      if (second !== this.lastTimerSecond) {
        this.lastTimerSecond = second;
        if (isCountdownSecond(second, this.step())) {
          this.speak(String(second));
        } else if (second > 0 && second % 60 === 0) {
          this.speak(this.i18n.plural('voice.minutes', second / 60));
        }
      }
    } else {
      this.lastTimerSecond = -1;
    }
    const stopwatch = this.counter.stopwatch();
    if (stopwatch.startedAt !== null) {
      const minute = Math.floor(elapsedMs(stopwatch, now) / 60_000);
      if (this.lastStopwatchMinute >= 0 && minute > this.lastStopwatchMinute) {
        this.speak(this.i18n.plural('voice.minutes', minute));
      }
      this.lastStopwatchMinute = minute;
    } else {
      this.lastStopwatchMinute = -1;
    }
  }
}
