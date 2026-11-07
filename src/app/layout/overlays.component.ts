import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiService } from '@core/services/ui.service';
import { ConfettiComponent } from '@shared/components/confetti.component';
import { IconComponent } from '@shared/components/icon.component';

@Component({
  selector: 'app-overlays',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ConfettiComponent],
  template: `
    @if (ui.celebration(); as celebration) {
      <div class="celebration" (click)="ui.dismissCelebration()" role="alert">
        <app-confetti [seed]="celebration.id" />
        <div class="badge">
          <div class="medal"><app-icon name="trophy" [size]="40" /></div>
          <div class="title">{{ celebration.title }}</div>
          <div class="sub">{{ celebration.subtitle }}</div>
        </div>
      </div>
    }

    @if (ui.toast(); as toast) {
      <div class="toast glass" [class.success]="toast.tone === 'success'" [class.error]="toast.tone === 'error'" role="status">
        <span>{{ toast.message }}</span>
        @if (toast.action; as action) {
          <button type="button" class="toast-action" (click)="ui.runToastAction()">{{ action.label }}</button>
        }
      </div>
    }
  `,
  styles: `
    .celebration {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 50% 45%, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.85) 75%);
      animation: fade-in 0.25s ease both;
    }
    .badge {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      text-align: center;
      animation: pop 0.6s var(--spring) both;
    }
    .medal {
      display: grid;
      place-items: center;
      width: 96px;
      height: 96px;
      margin-bottom: 10px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--on-accent);
      box-shadow:
        0 0 0 10px var(--accent-soft),
        0 0 60px var(--accent-glow);
    }
    .title {
      font-family: var(--font-display);
      font-size: clamp(26px, 7vw, 40px);
      font-weight: 700;
      text-shadow: 0 2px 20px rgb(0 0 0 / 0.5);
    }
    .sub {
      color: var(--text-muted);
      font-size: 16px;
      font-weight: 700;
    }
    .toast {
      position: fixed;
      left: 50%;
      top: calc(76px + var(--safe-top));
      z-index: 70;
      display: flex;
      align-items: center;
      gap: 14px;
      width: max-content;
      max-width: calc(100% - 32px);
      padding: 8px 8px 8px 18px;
      min-height: 52px;
      border-radius: 999px;
      background: var(--glass-strong);
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 12px 30px rgb(0 0 0 / 0.4);
      transform: translateX(-50%);
      animation: toast-in 0.4s var(--spring) both;
    }
    .toast:not(:has(.toast-action)) {
      padding-right: 18px;
    }
    .toast.success {
      box-shadow:
        0 0 0 1.5px var(--accent),
        0 12px 30px rgb(0 0 0 / 0.4);
    }
    .toast-action {
      height: 38px;
      padding: 0 16px;
      border: 0;
      border-radius: 999px;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 14px;
      font-weight: 800;
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: scale(0.6);
      }
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translate(-50%, -24px);
      }
    }
  `,
})
export class OverlaysComponent {
  protected readonly ui = inject(UiService);
}
