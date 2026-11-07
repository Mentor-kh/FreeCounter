import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { TranslationKey } from '@core/i18n/en';
import { AppLifecycleService } from '@core/services/app-lifecycle.service';
import { PagerService, PaneId, PANES } from '@core/services/pager.service';
import { UiService } from '@core/services/ui.service';
import { CounterPaneComponent } from '@features/counter/counter-pane.component';
import { GoalSheetComponent } from '@features/counter/goal-sheet.component';
import { LooksPaneComponent } from '@features/looks/looks-pane.component';
import { ContactSheetComponent } from '@features/settings/contact-sheet.component';
import { PrivacySheetComponent } from '@features/settings/privacy-sheet.component';
import { SettingsPaneComponent } from '@features/settings/settings-pane.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { BackdropComponent } from './layout/backdrop.component';
import { OverlaysComponent } from './layout/overlays.component';

const PANE_LABELS: Readonly<Record<PaneId, TranslationKey>> = {
  looks: 'pane.looks',
  counter: 'pane.counter',
  settings: 'pane.settings',
};

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BackdropComponent,
    OverlaysComponent,
    CounterPaneComponent,
    GoalSheetComponent,
    PrivacySheetComponent,
    ContactSheetComponent,
    LooksPaneComponent,
    SettingsPaneComponent,
    TranslatePipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly lifecycle = inject(AppLifecycleService);
  protected readonly ui = inject(UiService);
  private readonly pagerHost = viewChild.required<ElementRef<HTMLElement>>('pagerHost');
  protected readonly pager = inject(PagerService);
  protected readonly panes = PANES;
  protected readonly paneLabels = PANE_LABELS;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const host = this.pagerHost().nativeElement;
      this.pager.attach(host);
      const onResize = (): void => this.pager.goTo(this.pager.pane(), false);
      window.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        this.pager.detach();
      });
      void this.lifecycle.start();
    });
  }

  protected onScroll(): void {
    this.pager.syncFromScroll();
  }
}
