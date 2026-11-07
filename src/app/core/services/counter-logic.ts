import { LIMITS } from '../config/app.constants';
import { CounterState, Lap, StopwatchState, TapState, TimerState } from '../models/counter.model';
import {
  clamp,
  isRecord,
  readArray,
  readBoolean,
  readNullableNumber,
  readNumber,
  readOneOf,
  UnknownRecord,
} from './sanitize';

export const INITIAL_TAP: TapState = {
  value: 0,
  start: 0,
  direction: 'up',
  goal: null,
  goalReached: false,
  undoStack: [],
};

export const INITIAL_STOPWATCH: StopwatchState = { startedAt: null, accumulatedMs: 0, laps: [] };

export const INITIAL_TIMER: TimerState = { durationMs: 30_000, startedAt: null, accumulatedMs: 0, finished: false };

export function initialCounterState(): CounterState {
  return { version: 2, mode: 'tap', tap: INITIAL_TAP, stopwatch: INITIAL_STOPWATCH, timer: INITIAL_TIMER };
}

export function elapsedMs(state: StopwatchState | TimerState, now: number): number {
  return state.accumulatedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}

export function remainingMs(timer: TimerState, now: number): number {
  return Math.max(0, timer.durationMs - elapsedMs(timer, now));
}

export function timerProgress(timer: TimerState, now: number): number {
  return timer.durationMs <= 0 ? 0 : clamp(remainingMs(timer, now) / timer.durationMs, 0, 1);
}

function clampValue(value: number): number {
  return clamp(Math.round(value * 1000) / 1000, -LIMITS.maxAbsValue, LIMITS.maxAbsValue);
}

/**
 * @description Checks whether the value is at or beyond the goal, looking from the start value towards the goal.
 * @param tap Counter state providing the start value and goal.
 * @param value Value to check.
 * @returns True when the goal is reached; always false without a goal or when the goal equals the start.
 */
export function isGoalReached(tap: TapState, value: number): boolean {
  if (tap.goal === null || tap.goal === tap.start) {
    return false;
  }
  return tap.goal > tap.start ? value >= tap.goal : value <= tap.goal;
}

export function tapProgress(tap: TapState): number | null {
  if (tap.goal === null || tap.goal === tap.start) {
    return null;
  }
  return clamp((tap.value - tap.start) / (tap.goal - tap.start), 0, 1);
}

/**
 * @description Applies one tap in the current direction.
 * @param tap Current state.
 * @returns Next state and whether the goal has just been reached by this tap.
 */
export function applyTap(tap: TapState): { readonly next: TapState; readonly justReached: boolean } {
  const value = clampValue(tap.value + (tap.direction === 'up' ? 1 : -1));
  const reached = isGoalReached(tap, value);
  return {
    justReached: reached && !tap.goalReached,
    next: {
      ...tap,
      value,
      goalReached: reached,
      undoStack: [...tap.undoStack, tap.value].slice(-LIMITS.undoDepth),
    },
  };
}

export function undoTap(tap: TapState): TapState {
  if (tap.undoStack.length === 0) {
    return tap;
  }
  const value = tap.undoStack[tap.undoStack.length - 1];
  return { ...tap, value, undoStack: tap.undoStack.slice(0, -1), goalReached: isGoalReached(tap, value) };
}

/**
 * @description Sets the goal and the start value. When the counter has not been moved from the old start yet,
 * it jumps to the new start so "count down from 100 to 0" works in one step.
 * @param tap Current state.
 * @param goal New goal or null to remove it.
 * @param start New start value (the value reset returns to).
 * @returns Updated state.
 */
export function applyGoal(tap: TapState, goal: number | null, start: number): TapState {
  const untouched = tap.value === tap.start;
  const value = untouched ? clampValue(start) : tap.value;
  const direction = goal !== null && goal !== start ? (goal > start ? 'up' : 'down') : tap.direction;
  const next: TapState = {
    ...tap,
    goal: goal === null ? null : clampValue(goal),
    start: clampValue(start),
    value,
    direction,
  };
  return { ...next, goalReached: isGoalReached(next, value) };
}

export function resetTap(tap: TapState): TapState {
  return {
    ...tap,
    value: tap.start,
    goalReached: false,
    undoStack: [...tap.undoStack, tap.value].slice(-LIMITS.undoDepth),
  };
}

export function toggleClock<T extends StopwatchState | TimerState>(state: T, now: number): T {
  return state.startedAt === null
    ? { ...state, startedAt: now }
    : { ...state, accumulatedMs: elapsedMs(state, now), startedAt: null };
}

export function addLap(stopwatch: StopwatchState, now: number): StopwatchState {
  if (stopwatch.laps.length >= LIMITS.maxLaps) {
    return stopwatch;
  }
  const total = elapsedMs(stopwatch, now);
  const previous = stopwatch.laps[0]?.totalMs ?? 0;
  const lap: Lap = { index: stopwatch.laps.length + 1, totalMs: total, splitMs: total - previous };
  return { ...stopwatch, laps: [lap, ...stopwatch.laps] };
}

function sanitizeTap(raw: UnknownRecord): TapState {
  const tap: TapState = {
    value: clampValue(readNumber(raw, 'value', 0)),
    start: clampValue(readNumber(raw, 'start', 0)),
    direction: readOneOf(raw, 'direction', ['up', 'down'], 'up'),
    goal: readNullableNumber(raw, 'goal'),
    goalReached: false,
    undoStack: readArray(raw, 'undoStack')
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      .slice(-LIMITS.undoDepth),
  };
  return { ...tap, goalReached: isGoalReached(tap, tap.value) };
}

function sanitizeLaps(raw: readonly unknown[]): readonly Lap[] {
  return raw
    .filter(isRecord)
    .map((lap, i) => ({
      index: readNumber(lap, 'index', i + 1),
      totalMs: Math.max(0, readNumber(lap, 'totalMs', 0)),
      splitMs: Math.max(0, readNumber(lap, 'splitMs', 0)),
    }))
    .slice(0, LIMITS.maxLaps);
}

function sanitizeStopwatch(raw: UnknownRecord): StopwatchState {
  return {
    startedAt: readNullableNumber(raw, 'startedAt'),
    accumulatedMs: Math.max(0, readNumber(raw, 'accumulatedMs', 0)),
    laps: sanitizeLaps(readArray(raw, 'laps')),
  };
}

function sanitizeTimer(raw: UnknownRecord): TimerState {
  return {
    durationMs: clamp(readNumber(raw, 'durationMs', INITIAL_TIMER.durationMs), 0, LIMITS.maxTimerMs),
    startedAt: readNullableNumber(raw, 'startedAt'),
    accumulatedMs: Math.max(0, readNumber(raw, 'accumulatedMs', 0)),
    finished: readBoolean(raw, 'finished', false),
  };
}

function section(raw: UnknownRecord, key: string): UnknownRecord {
  const value = raw[key];
  return isRecord(value) ? value : {};
}

/**
 * @description Restores the counter state from untrusted persisted data, falling back to defaults per field.
 * @param raw Parsed JSON value.
 * @returns Valid state or null when nothing usable was stored.
 */
export function sanitizeCounterState(raw: unknown): CounterState | null {
  if (!isRecord(raw)) {
    return null;
  }
  return {
    version: 2,
    mode: readOneOf(raw, 'mode', ['tap', 'stopwatch', 'timer'], 'tap'),
    tap: sanitizeTap(section(raw, 'tap')),
    stopwatch: sanitizeStopwatch(section(raw, 'stopwatch')),
    timer: sanitizeTimer(section(raw, 'timer')),
  };
}
