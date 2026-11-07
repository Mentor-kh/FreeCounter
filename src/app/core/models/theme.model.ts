export type ArtThemeId = 'psychedelic' | 'latte' | 'nebula' | 'matcha' | 'cyber' | 'aurora';

export type SoundPackId = 'default' | 'psychedelic' | 'latte' | 'nebula' | 'matcha' | 'cyber' | 'aurora';

export type ColorScheme = 'dark' | 'light';

export interface ArtTheme {
  readonly id: ArtThemeId;
  readonly accent: string;
  readonly scheme: ColorScheme;
  readonly art: string;
  readonly thumb: string;
  readonly sounds: SoundPackId;
}

export interface LookTokens {
  readonly scheme: ColorScheme;
  readonly bg: string;
  readonly art: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly accentGlow: string;
  readonly onAccent: string;
  readonly text: string;
  readonly textMuted: string;
  readonly glass: string;
  readonly glassStrong: string;
  readonly hairline: string;
  readonly scrim: string;
  readonly sounds: SoundPackId;
}
