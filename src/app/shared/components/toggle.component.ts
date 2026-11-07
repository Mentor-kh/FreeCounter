import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'switch',
    tabindex: '0',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-label]': 'label()',
    '[class.on]': 'checked()',
    '[class.disabled]': 'disabled()',
    '(click)': 'toggle($event)',
    '(keydown.enter)': 'toggle($event)',
    '(keydown.space)': 'toggle($event)',
  },
  template: `<span class="thumb"></span>`,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      flex-shrink: 0;
      width: 50px;
      height: 30px;
      border-radius: 999px;
      background: rgb(255 255 255 / 0.16);
      transition: background 0.25s ease;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    :host(.on) {
      background: var(--accent);
    }
    :host(.disabled) {
      opacity: 0.45;
      pointer-events: none;
    }
    .thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    :host(.on) .thumb {
      transform: translateX(20px);
    }
  `,
})
export class ToggleComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly label = input<string>('');

  protected toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) {
      this.checked.set(!this.checked());
    }
  }
}
