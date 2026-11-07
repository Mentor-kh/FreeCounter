import { Directive, ElementRef, inject, input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

const RIPPLE_MS = 550;

@Directive({
  selector: '[appRipple]',
  host: { class: 'ripple-host' },
})
export class RippleDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private unlisten: (() => void) | null = null;

  readonly rippleDisabled = input<boolean>(false);
  readonly rippleCentered = input<boolean>(false);

  ngOnInit(): void {
    this.unlisten = this.renderer.listen(this.host.nativeElement, 'pointerdown', (event: PointerEvent) =>
      this.spawn(event),
    );
  }

  ngOnDestroy(): void {
    this.unlisten?.();
  }

  /**
   * @description Creates an expanding "drop" from the touch point that fades out and removes itself.
   * @param event Pointer event that triggered the ripple.
   */
  private spawn(event: PointerEvent): void {
    if (this.rippleDisabled() || event.button > 0) {
      return;
    }
    const el = this.host.nativeElement;
    const rect = el.getBoundingClientRect();
    const x = this.rippleCentered() ? rect.width / 2 : event.clientX - rect.left;
    const y = this.rippleCentered() ? rect.height / 2 : event.clientY - rect.top;
    const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
    const drop = this.renderer.createElement('span') as HTMLSpanElement;
    drop.className = 'ripple-drop';
    drop.style.width = drop.style.height = `${radius * 2}px`;
    drop.style.left = `${x - radius}px`;
    drop.style.top = `${y - radius}px`;
    this.renderer.appendChild(el, drop);
    setTimeout(() => drop.remove(), RIPPLE_MS);
  }
}
