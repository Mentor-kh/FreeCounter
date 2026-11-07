import { computed, effect, inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { ART_THEMES, findArtTheme } from '../config/themes.catalog';
import { ArtTheme, ArtThemeId, LookTokens } from '../models/theme.model';
import { artLookTokens, customLookTokens, isHexColor, randomAccent, tokensToCssVars } from './theme-factory';
import { PurchaseService } from './purchase.service';
import { SettingsStore } from './settings.store';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(SettingsStore);
  private readonly purchases = inject(PurchaseService);

  readonly themes: readonly ArtTheme[] = ART_THEMES;
  readonly accent = computed<string>(() => this.settings.settings().accent);
  readonly activeArt = computed<ArtThemeId | null>(() => {
    const chosen = this.settings.settings().artTheme;
    return chosen !== null && this.purchases.isUnlocked(chosen) ? chosen : null;
  });
  readonly tokens = computed<LookTokens>(() => {
    const id = this.activeArt();
    const art = id === null ? undefined : findArtTheme(id);
    return art === undefined ? customLookTokens(this.accent()) : artLookTokens(art);
  });

  constructor() {
    effect(() => this.apply(this.tokens()));
    if (Capacitor.isNativePlatform()) {
      void SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => undefined);
    }
  }

  setAccent(accent: string): void {
    if (!isHexColor(accent)) {
      return;
    }
    this.settings.update({ accent: accent.toLowerCase(), artTheme: null });
  }

  randomize(): void {
    this.setAccent(randomAccent());
  }

  selectArt(id: ArtThemeId): boolean {
    if (!this.purchases.isUnlocked(id)) {
      return false;
    }
    this.settings.update({ artTheme: id });
    return true;
  }

  private apply(tokens: LookTokens): void {
    const root = this.document.documentElement;
    for (const [name, value] of Object.entries(tokensToCssVars(tokens))) {
      root.style.setProperty(name, value);
    }
    this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.bg);
  }
}
