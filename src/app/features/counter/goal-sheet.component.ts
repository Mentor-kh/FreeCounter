import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GOAL_PRESETS } from '@core/config/app.constants';
import { I18nService } from '@core/i18n/i18n.service';
import { CounterStore } from '@core/services/counter.store';
import { UiService } from '@core/services/ui.service';
import { SheetComponent } from '@shared/components/sheet.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

function parseNumber(raw: string): number | null {
  const value = Number(raw.replace(',', '.').trim());
  return raw.trim() !== '' && Number.isFinite(value) ? value : null;
}

@Component({
  selector: 'app-goal-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, TranslatePipe],
  template: `
    <app-sheet [title]="'goal.title' | t" [closeLabel]="'common.close' | t" (closed)="ui.closeSheet()">
      <div class="fields">
        <label>
          <span>{{ 'goal.target' | t }}</span>
          <input
            class="field"
            type="number"
            inputmode="decimal"
            [value]="goalText()"
            (input)="goalText.set(read($event))"
            (keydown.enter)="apply()"
          />
        </label>
        <label>
          <span>{{ 'goal.start' | t }}</span>
          <input
            class="field"
            type="number"
            inputmode="decimal"
            [value]="startText()"
            (input)="startText.set(read($event))"
            (keydown.enter)="apply()"
          />
        </label>
      </div>
      <div class="presets">
        @for (preset of presets; track preset) {
          <button type="button" class="chip" [class.accent]="goalText() === '' + preset" (click)="goalText.set('' + preset)">
            {{ i18n.formatNumber(preset) }}
          </button>
        }
      </div>
      <p class="hint">{{ 'goal.hint' | t }}</p>
      <div class="actions">
        <button type="button" class="btn ghost" (click)="clear()">{{ 'goal.none' | t }}</button>
        <button type="button" class="btn accent" [disabled]="!valid()" (click)="apply()">{{ 'goal.apply' | t }}</button>
      </div>
    </app-sheet>
  `,
  styles: `
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    label span {
      display: block;
      margin: 0 0 6px 4px;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .presets .chip {
      height: 40px;
      padding: 0 14px;
      font-size: 14px;
    }
    .hint {
      margin: 16px 4px 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .actions {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      margin-top: 20px;
    }
  `,
})
export class GoalSheetComponent {
  private readonly counter = inject(CounterStore);
  protected readonly ui = inject(UiService);
  protected readonly i18n = inject(I18nService);
  protected readonly presets = GOAL_PRESETS;
  protected readonly goalText = signal<string>(String(this.counter.tapState().goal ?? ''));
  protected readonly startText = signal<string>(String(this.counter.tapState().start));
  protected readonly valid = computed<boolean>(
    () => parseNumber(this.goalText()) !== null && parseNumber(this.startText() === '' ? '0' : this.startText()) !== null,
  );

  protected read(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected apply(): void {
    const goal = parseNumber(this.goalText());
    const start = parseNumber(this.startText() === '' ? '0' : this.startText());
    if (goal === null || start === null) {
      return;
    }
    this.counter.setGoal(goal, start);
    this.ui.closeSheet();
  }

  protected clear(): void {
    this.counter.setGoal(null, this.counter.tapState().start);
    this.ui.closeSheet();
  }
}
