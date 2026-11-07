import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICON_PATHS, IconName } from './icon-paths';

export type { IconName } from './icon-paths';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'icon' },
  template: `
    <svg viewBox="0 0 256 256" [attr.width]="size()" [attr.height]="size()" fill="currentColor">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(24);

  protected readonly path = computed<string>(() => ICON_PATHS[this.name()]);
}
