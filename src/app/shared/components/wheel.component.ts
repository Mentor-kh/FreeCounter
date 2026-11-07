import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const ITEM_HEIGHT = 40;
const SETTLE_MS = 140;

@Component({
  selector: 'app-wheel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.disabled]': 'disabled()' },
  template: `
    <div
      #list
      class="list"
      role="spinbutton"
      tabindex="0"
      [attr.aria-label]="label()"
      [attr.aria-valuenow]="current()"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="max()"
      (scroll)="onScroll()"
      (keydown.arrowUp)="step(-1, $event)"
      (keydown.arrowDown)="step(1, $event)"
    >
      <div class="pad"></div>
      @for (n of values(); track n) {
        <div class="item" [class.on]="n === current()" (click)="scrollToValue(n, true)">{{ format(n) }}</div>
      }
      <div class="pad"></div>
    </div>
    <span class="unit">{{ unit() }}</span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: clamp(64px, 19vw, 84px);
      height: ${ITEM_HEIGHT * 3}px;
      transition: opacity 0.2s ease;
    }
    :host(.disabled) {
      opacity: 0.35;
      pointer-events: none;
    }
    :host::before {
      content: '';
      position: absolute;
      inset: ${ITEM_HEIGHT}px 0;
      border-radius: 14px;
      background: var(--glass);
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      pointer-events: none;
    }
    .list {
      position: relative;
      height: 100%;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      overscroll-behavior: contain;
      scrollbar-width: none;
      mask-image: linear-gradient(180deg, transparent, #000 32%, #000 68%, transparent);
      -webkit-mask-image: linear-gradient(180deg, transparent, #000 32%, #000 68%, transparent);
    }
    .list::-webkit-scrollbar {
      display: none;
    }
    .list:focus-visible {
      outline: none;
    }
    .pad {
      height: ${ITEM_HEIGHT}px;
    }
    .item {
      display: grid;
      place-items: center;
      padding-right: 22px;
      height: ${ITEM_HEIGHT}px;
      color: var(--text-muted);
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      scroll-snap-align: center;
      transition:
        color 0.15s ease,
        transform 0.2s var(--spring);
    }
    .item.on {
      color: var(--text);
      transform: scale(1.12);
    }
    .unit {
      position: absolute;
      top: 50%;
      right: 8px;
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 800;
      transform: translateY(-50%);
      pointer-events: none;
    }
  `,
})
export class WheelComponent {
  private readonly list = viewChild.required<ElementRef<HTMLDivElement>>('list');
  private settleHandle: ReturnType<typeof setTimeout> | null = null;
  private ready = false;

  readonly value = input.required<number>();
  readonly max = input.required<number>();
  readonly unit = input<string>('');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly changed = output<number>();
  readonly ticked = output<void>();

  protected readonly current = signal<number>(0);
  protected readonly values = computed<readonly number[]>(() => Array.from({ length: this.max() + 1 }, (_, i) => i));

  constructor() {
    afterNextRender(() => {
      this.ready = true;
      this.scrollToValue(this.value(), false);
    });
    effect(() => {
      const value = this.value();
      if (this.ready && this.settleHandle === null && value !== this.current()) {
        this.scrollToValue(value, true);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.settleHandle !== null) {
        clearTimeout(this.settleHandle);
      }
    });
  }

  protected format(n: number): string {
    return n.toString().padStart(2, '0');
  }

  protected onScroll(): void {
    const index = Math.min(this.max(), Math.max(0, Math.round(this.list().nativeElement.scrollTop / ITEM_HEIGHT)));
    if (index !== this.current()) {
      this.current.set(index);
      this.ticked.emit();
    }
    if (this.settleHandle !== null) {
      clearTimeout(this.settleHandle);
    }
    this.settleHandle = setTimeout(() => {
      this.settleHandle = null;
      if (this.current() !== this.value()) {
        this.changed.emit(this.current());
      }
    }, SETTLE_MS);
  }

  protected step(delta: number, event: Event): void {
    event.preventDefault();
    this.scrollToValue(Math.min(this.max(), Math.max(0, this.current() + delta)), true);
  }

  protected scrollToValue(value: number, smooth: boolean): void {
    this.current.set(value);
    this.list().nativeElement.scrollTo({ top: value * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'instant' });
  }
}
