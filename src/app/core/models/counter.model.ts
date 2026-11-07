export type CounterMode = 'tap' | 'stopwatch' | 'timer';

export type CountDirection = 'up' | 'down';

export interface Lap {
  readonly index: number;
  readonly totalMs: number;
  readonly splitMs: number;
}

export interface TapState {
  readonly value: number;
  readonly start: number;
  readonly direction: CountDirection;
  readonly goal: number | null;
  readonly goalReached: boolean;
  readonly undoStack: readonly number[];
}

export interface StopwatchState {
  readonly startedAt: number | null;
  readonly accumulatedMs: number;
  readonly laps: readonly Lap[];
}

export interface TimerState {
  readonly durationMs: number;
  readonly startedAt: number | null;
  readonly accumulatedMs: number;
  readonly finished: boolean;
}

export interface CounterState {
  readonly version: 2;
  readonly mode: CounterMode;
  readonly tap: TapState;
  readonly stopwatch: StopwatchState;
  readonly timer: TimerState;
}

export type CounterEventKind = 'goal' | 'timerFinished' | 'started' | 'paused' | 'reset' | 'lap';

export interface CounterEvent {
  readonly kind: CounterEventKind;
  readonly mode: CounterMode;
}

export interface ResetSnapshot {
  readonly mode: CounterMode;
  readonly state: CounterState;
}
