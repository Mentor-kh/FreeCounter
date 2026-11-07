import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="scrim" (click)="closed.emit()"></div>
    <section class="panel glass" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <header>
        <h2>{{ title() }}</h2>
        <button type="button" class="round close" [attr.aria-label]="closeLabel()" (click)="closed.emit()">
          <app-icon name="close" [size]="20" />
        </button>
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: rgb(0 0 0 / 0.45);
      animation: fade 0.25s ease both;
    }
    .panel {
      position: relative;
      width: min(560px, 100%);
      max-height: 88dvh;
      overflow-y: auto;
      padding: 18px var(--gutter) calc(24px + var(--safe-bottom));
      border-radius: 32px 32px 0 0;
      background: var(--glass-strong);
      animation: up 0.42s var(--spring) both;
    }
    @media (min-width: 600px) {
      :host {
        align-items: center;
      }
      .panel {
        padding-bottom: 24px;
        border-radius: 32px;
      }
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 700;
    }
    .close {
      width: 44px;
      height: 44px;
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes up {
      from {
        transform: translateY(40%);
        opacity: 0;
      }
    }
  `,
})
export class SheetComponent {
  readonly title = input.required<string>();
  readonly closeLabel = input<string>('Close');
  readonly closed = output<void>();
}
