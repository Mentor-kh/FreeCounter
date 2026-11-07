import { DestroyRef, effect, inject, Signal, signal } from '@angular/core';

/**
 * @description Creates a signal holding the current timestamp that refreshes on animation frames while
 * `active` is true, and stays idle otherwise. Must be called in an injection context.
 * @param active Whether the ticker should run.
 * @param intervalMs Minimum time between updates.
 * @returns Read-only signal with the latest Date.now() value.
 */
export function injectTicker(active: Signal<boolean>, intervalMs: number): Signal<number> {
  const now = signal(Date.now());
  let handle = 0;
  let last = 0;
  const loop = (time: number): void => {
    if (time - last >= intervalMs) {
      last = time;
      now.set(Date.now());
    }
    handle = requestAnimationFrame(loop);
  };
  effect(() => {
    cancelAnimationFrame(handle);
    now.set(Date.now());
    if (active()) {
      handle = requestAnimationFrame(loop);
    }
  });
  inject(DestroyRef).onDestroy(() => cancelAnimationFrame(handle));
  return now.asReadonly();
}
