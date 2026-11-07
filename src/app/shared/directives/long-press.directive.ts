import { DestroyRef, Directive, inject, output } from '@angular/core';

const HOLD_MS = 450;

@Directive({
  selector: '[appLongPress]',
  exportAs: 'appLongPress',
  host: {
    '(pointerdown)': 'start($event)',
    '(pointerup)': 'cancel()',
    '(pointerleave)': 'cancel()',
    '(pointercancel)': 'cancel()',
    '(contextmenu)': '$event.preventDefault()',
  },
})
export class LongPressDirective {
  private handle: ReturnType<typeof setTimeout> | null = null;
  private fired = false;

  readonly longPress = output<void>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  /**
   * @description Tells the click handler whether this click ends a long press, and resets the flag.
   * @returns True when the click must be ignored because the long press already did its action.
   */
  consumed(): boolean {
    const fired = this.fired;
    this.fired = false;
    return fired;
  }

  protected start(event: PointerEvent): void {
    if (event.button > 0) {
      return;
    }
    this.cancel();
    this.fired = false;
    this.handle = setTimeout(() => {
      this.handle = null;
      this.fired = true;
      this.longPress.emit();
    }, HOLD_MS);
  }

  protected cancel(): void {
    if (this.handle !== null) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }
}
