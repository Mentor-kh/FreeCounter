import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LIMITS, STORAGE_KEYS } from '../config/app.constants';
import {
  CounterEvent,
  CounterEventKind,
  CounterMode,
  CounterState,
  ResetSnapshot,
  StopwatchState,
  TapState,
  TimerState,
} from '../models/counter.model';
import {
  addLap,
  applyGoal,
  applyTap,
  elapsedMs,
  INITIAL_STOPWATCH,
  initialCounterState,
  remainingMs,
  resetTap,
  sanitizeCounterState,
  toggleClock,
  undoTap,
} from './counter-logic';
import { StorageService } from './storage.service';

const SAVE_DEBOUNCE_MS = 300;
const WATCH_INTERVAL_MS = 250;
const MODE_ORDER: readonly CounterMode[] = ['tap', 'stopwatch', 'timer'];

@Injectable({ providedIn: 'root' })
export class CounterStore {
  private readonly storage = inject(StorageService);
  private readonly state = signal<CounterState>(initialCounterState());
  private readonly eventsSubject = new Subject<CounterEvent>();
  private lastReset: ResetSnapshot | null = null;
  private saveHandle: ReturnType<typeof setTimeout> | null = null;
  private watchHandle: ReturnType<typeof setInterval> | null = null;

  readonly mode = computed<CounterMode>(() => this.state().mode);
  readonly tapState = computed<TapState>(() => this.state().tap);
  readonly stopwatch = computed<StopwatchState>(() => this.state().stopwatch);
  readonly timer = computed<TimerState>(() => this.state().timer);
  readonly timerRunning = computed<boolean>(() => this.state().timer.startedAt !== null);
  readonly stopwatchRunning = computed<boolean>(() => this.state().stopwatch.startedAt !== null);
  readonly events$: Observable<CounterEvent> = this.eventsSubject.asObservable();

  async load(): Promise<void> {
    const stored = await this.storage.read(STORAGE_KEYS.counter, sanitizeCounterState);
    if (stored !== null) {
      this.state.set(stored);
    }
    this.checkTimer(false);
    this.syncWatcher();
  }

  cycleMode(): CounterMode {
    const index = MODE_ORDER.indexOf(this.state().mode);
    const mode = MODE_ORDER[(index + 1) % MODE_ORDER.length];
    this.commit((s) => ({ ...s, mode }));
    return mode;
  }

  tap(): void {
    const result = applyTap(this.state().tap);
    this.commit((s) => ({ ...s, tap: result.next }));
    if (result.justReached) {
      this.emit('goal');
    }
  }

  toggleDirection(): void {
    this.commit((s) => ({ ...s, tap: { ...s.tap, direction: s.tap.direction === 'up' ? 'down' : 'up' } }));
  }

  setGoal(goal: number | null, start: number): void {
    this.commit((s) => ({ ...s, tap: applyGoal(s.tap, goal, start) }));
  }

  undo(): void {
    this.commit((s) => ({ ...s, tap: undoTap(s.tap) }));
  }

  /**
   * @description Resets the current mode immediately and keeps a snapshot so the reset can be undone from the toast.
   * @returns True when something was actually reset.
   */
  reset(): boolean {
    const before = this.state();
    const now = Date.now();
    let next: CounterState;
    switch (before.mode) {
      case 'tap':
        if (before.tap.value === before.tap.start) {
          return false;
        }
        next = { ...before, tap: resetTap(before.tap) };
        break;
      case 'stopwatch':
        if (elapsedMs(before.stopwatch, now) === 0 && before.stopwatch.laps.length === 0) {
          return false;
        }
        next = { ...before, stopwatch: INITIAL_STOPWATCH };
        break;
      case 'timer':
        if (before.timer.startedAt === null && before.timer.accumulatedMs === 0 && !before.timer.finished) {
          return false;
        }
        next = { ...before, timer: { ...before.timer, startedAt: null, accumulatedMs: 0, finished: false } };
        break;
    }
    this.lastReset = { mode: before.mode, state: before };
    this.commit(() => next);
    this.emit('reset');
    this.syncWatcher();
    return true;
  }

  /**
   * @description Restores the state captured by the last reset. Running clocks keep counting as if never reset.
   */
  restoreReset(): void {
    const snapshot = this.lastReset;
    if (snapshot === null) {
      return;
    }
    this.lastReset = null;
    this.commit((s) => {
      switch (snapshot.mode) {
        case 'tap':
          return { ...s, tap: snapshot.state.tap };
        case 'stopwatch':
          return { ...s, stopwatch: snapshot.state.stopwatch };
        case 'timer':
          return { ...s, timer: snapshot.state.timer };
      }
    });
    this.checkTimer();
    this.syncWatcher();
  }

  toggleRun(): void {
    const now = Date.now();
    const s = this.state();
    if (s.mode === 'stopwatch') {
      this.commit(() => ({ ...s, stopwatch: toggleClock(s.stopwatch, now) }));
      this.emit(s.stopwatch.startedAt === null ? 'started' : 'paused');
    } else if (s.mode === 'timer') {
      if (s.timer.durationMs <= 0) {
        return;
      }
      const restart = s.timer.startedAt === null && (s.timer.finished || remainingMs(s.timer, now) <= 0);
      const timer: TimerState = restart
        ? { ...s.timer, accumulatedMs: 0, finished: false, startedAt: now }
        : toggleClock(s.timer, now);
      this.commit(() => ({ ...s, timer }));
      this.emit(s.timer.startedAt === null ? 'started' : 'paused');
    }
    this.syncWatcher();
  }

  lap(): void {
    this.commit((s) => ({ ...s, stopwatch: addLap(s.stopwatch, Date.now()) }));
    this.emit('lap');
  }

  addTime(ms: number): void {
    this.commit((s) => {
      const durationMs = Math.min(LIMITS.maxTimerMs, s.timer.durationMs + ms);
      return { ...s, timer: { ...s.timer, durationMs, finished: s.timer.finished && durationMs <= elapsedMs(s.timer, Date.now()) } };
    });
  }

  /**
   * @description Sets a new timer duration and optionally starts it right away.
   * @param durationMs New duration.
   * @param start When true the timer starts immediately.
   */
  setTimerDuration(durationMs: number, start: boolean): void {
    const safe = Math.min(LIMITS.maxTimerMs, Math.max(0, Math.round(durationMs)));
    const current = this.state().timer;
    if (!start && current.durationMs === safe && current.startedAt === null && current.accumulatedMs === 0) {
      return;
    }
    this.commit((s) => ({
      ...s,
      timer: { durationMs: safe, startedAt: start && safe > 0 ? Date.now() : null, accumulatedMs: 0, finished: false },
    }));
    if (start && safe > 0) {
      this.emit('started');
    }
    this.syncWatcher();
  }

  flush(): Promise<void> {
    if (this.saveHandle !== null) {
      clearTimeout(this.saveHandle);
      this.saveHandle = null;
    }
    return this.storage.write(STORAGE_KEYS.counter, this.state());
  }

  /**
   * @description Marks the timer finished once its time is up.
   * @param emitEvents When false the state is updated silently (e.g. on startup after the app was closed).
   */
  checkTimer(emitEvents = true): void {
    const timer = this.state().timer;
    if (timer.startedAt === null || remainingMs(timer, Date.now()) > 0) {
      return;
    }
    this.commit((s) => ({ ...s, timer: { ...s.timer, startedAt: null, accumulatedMs: s.timer.durationMs, finished: true } }));
    if (emitEvents) {
      this.emit('timerFinished', 'timer');
    }
    this.syncWatcher();
  }

  private syncWatcher(): void {
    const running = this.state().timer.startedAt !== null;
    if (running && this.watchHandle === null) {
      this.watchHandle = setInterval(() => this.checkTimer(), WATCH_INTERVAL_MS);
    } else if (!running && this.watchHandle !== null) {
      clearInterval(this.watchHandle);
      this.watchHandle = null;
    }
  }

  private emit(kind: CounterEventKind, mode: CounterMode = this.state().mode): void {
    this.eventsSubject.next({ kind, mode });
  }

  private commit(update: (state: CounterState) => CounterState): void {
    this.state.update(update);
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveHandle !== null) {
      clearTimeout(this.saveHandle);
    }
    this.saveHandle = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }
}
