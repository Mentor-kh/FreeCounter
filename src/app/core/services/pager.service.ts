import { Injectable, signal } from '@angular/core';

export type PaneId = 'looks' | 'counter' | 'settings';

export const PANES: readonly PaneId[] = ['looks', 'counter', 'settings'];

const HOME: PaneId = 'counter';

@Injectable({ providedIn: 'root' })
export class PagerService {
  private host: HTMLElement | null = null;
  private readonly paneState = signal<PaneId>(HOME);

  readonly pane = this.paneState.asReadonly();

  attach(host: HTMLElement): void {
    this.host = host;
    this.goTo(this.paneState(), false);
  }

  detach(): void {
    this.host = null;
  }

  isHome(): boolean {
    return this.paneState() === HOME;
  }

  goHome(): void {
    this.goTo(HOME);
  }

  goTo(pane: PaneId, smooth = true): void {
    const host = this.host;
    if (host === null) {
      this.paneState.set(pane);
      return;
    }
    host.scrollTo({ left: PANES.indexOf(pane) * host.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
    this.paneState.set(pane);
  }

  /**
   * @description Syncs the active pane with the scroll position of the pager after a swipe.
   */
  syncFromScroll(): void {
    const host = this.host;
    if (host === null || host.clientWidth === 0) {
      return;
    }
    const index = Math.round(host.scrollLeft / host.clientWidth);
    const pane = PANES[Math.min(PANES.length - 1, Math.max(0, index))];
    if (pane !== this.paneState()) {
      this.paneState.set(pane);
    }
  }
}
