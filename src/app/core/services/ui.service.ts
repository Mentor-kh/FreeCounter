import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly action: ToastAction | null;
}

export interface Celebration {
  readonly id: number;
  readonly title: string;
  readonly subtitle: string;
}

export type SheetId = 'goal' | 'privacy' | 'contact';

const TOAST_MS = 2600;
const ACTION_TOAST_MS = 4500;
const CELEBRATION_MS = 2600;

@Injectable({ providedIn: 'root' })
export class UiService {
  private sequence = 0;
  private readonly toastState = signal<Toast | null>(null);
  private readonly celebrationState = signal<Celebration | null>(null);
  private readonly sheetState = signal<SheetId | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private celebrationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly toast = this.toastState.asReadonly();
  readonly celebration = this.celebrationState.asReadonly();
  readonly sheet = this.sheetState.asReadonly();

  showToast(message: string, tone: ToastTone = 'info', action: ToastAction | null = null): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }
    this.toastState.set({ id: ++this.sequence, message, tone, action });
    this.toastTimer = setTimeout(() => this.toastState.set(null), action === null ? TOAST_MS : ACTION_TOAST_MS);
  }

  runToastAction(): void {
    const action = this.toastState()?.action;
    this.toastState.set(null);
    action?.run();
  }

  celebrate(title: string, subtitle: string): void {
    if (this.celebrationTimer !== null) {
      clearTimeout(this.celebrationTimer);
    }
    this.celebrationState.set({ id: ++this.sequence, title, subtitle });
    this.celebrationTimer = setTimeout(() => this.celebrationState.set(null), CELEBRATION_MS);
  }

  dismissCelebration(): void {
    this.celebrationState.set(null);
  }

  openSheet(id: SheetId): void {
    this.sheetState.set(id);
  }

  closeSheet(): void {
    this.sheetState.set(null);
  }

  /**
   * @description Closes the top-most overlay (sheet or celebration), used by the Android back button.
   * @returns True when an overlay was closed.
   */
  closeTopOverlay(): boolean {
    if (this.sheetState() !== null) {
      this.closeSheet();
      return true;
    }
    if (this.celebrationState() !== null) {
      this.dismissCelebration();
      return true;
    }
    return false;
  }
}
