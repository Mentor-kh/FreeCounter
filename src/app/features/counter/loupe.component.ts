import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RippleDirective } from '@shared/directives/ripple.directive';

const RING_RADIUS = 47;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

@Component({
  selector: 'app-loupe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RippleDirective],
  template: `
    <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" [attr.r]="radius" />
      @if (progress() !== null) {
        <circle
          class="arc"
          cx="50"
          cy="50"
          [attr.r]="radius"
          [attr.stroke-dasharray]="length"
          [attr.stroke-dashoffset]="offset()"
        />
      }
    </svg>
    <button #lens type="button" class="lens" appRipple [attr.aria-label]="label()" (click)="onPress()">
      <span #art class="lens-art"></span>
      <span class="optic"></span>
      <span class="content" [style.--scale]="scale()"><ng-content /></span>
    </button>
  `,
  styleUrl: './loupe.component.scss',
})
export class LoupeComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly lens = viewChild.required<ElementRef<HTMLButtonElement>>('lens');
  private readonly art = viewChild.required<ElementRef<HTMLSpanElement>>('art');
  private frame = 0;

  readonly progress = input<number | null>(null);
  readonly scale = input<number>(1);
  readonly label = input<string>('');
  readonly pressed = output<void>();

  protected readonly radius = RING_RADIUS;
  protected readonly length = RING_LENGTH;
  protected readonly offset = computed<number>(() => RING_LENGTH * (1 - (this.progress() ?? 0)));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const schedule = (): void => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.track());
      };
      const host = this.host.nativeElement;
      const onScroll = (event: Event): void => {
        if (event.target instanceof Node && event.target.contains(host)) {
          schedule();
        }
      };
      const observer = new ResizeObserver(schedule);
      observer.observe(host);
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      this.track();
      destroyRef.onDestroy(() => {
        observer.disconnect();
        document.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', schedule);
        cancelAnimationFrame(this.frame);
      });
    });
  }

  protected onPress(): void {
    const art = this.art().nativeElement;
    art.classList.remove('pulse');
    void art.offsetWidth;
    art.classList.add('pulse');
    this.pressed.emit();
  }

  /**
   * @description Aligns the magnified copy of the background with the real background behind the lens,
   * so the lens shows exactly the area it covers, zoomed in. Runs outside change detection.
   */
  private track(): void {
    const lens = this.lens().nativeElement;
    const rect = lens.getBoundingClientRect();
    const style = lens.style;
    style.setProperty('--lx', `${rect.left}px`);
    style.setProperty('--ly', `${rect.top}px`);
    style.setProperty('--ls', `${rect.width}px`);
    style.setProperty('--vw', `${window.innerWidth}px`);
    style.setProperty('--vh', `${window.innerHeight}px`);
  }
}
