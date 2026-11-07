import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (art of layers(); track art) {
      <div class="art"></div>
    }
    <div class="scrim"></div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: var(--bg);
      pointer-events: none;
    }
    .art {
      position: absolute;
      inset: 0;
      background: var(--art);
      animation: art-in 0.6s var(--ease-out) both;
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: var(--scrim);
    }
    @keyframes art-in {
      from {
        opacity: 0;
        transform: scale(1.04);
      }
    }
  `,
})
export class BackdropComponent {
  private readonly theme = inject(ThemeService);

  protected readonly layers = computed<readonly string[]>(() => [this.theme.tokens().art]);
}
