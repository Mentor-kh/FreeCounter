import { ArtTheme, LookTokens } from '../models/theme.model';

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

function parseHex(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgba(color: Rgb, alpha: number): string {
  return `rgb(${color.r} ${color.g} ${color.b} / ${alpha})`;
}

function luminance(color: Rgb): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/**
 * @description Builds a random vivid accent color, used by the "dice" button for the free look.
 * @returns Hex color string.
 */
export function randomAccent(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 85 + Math.random() * 15;
  const lightness = 55 + Math.random() * 12;
  const a = (saturation / 100) * Math.min(lightness / 100, 1 - lightness / 100);
  const channel = (n: number): string => {
    const k = (n + hue / 30) % 12;
    const value = lightness / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function baseTokens(accentHex: string): Omit<LookTokens, 'art' | 'sounds' | 'bg'> {
  const accent = parseHex(accentHex);
  return {
    scheme: 'dark',
    accent: accentHex,
    accentSoft: rgba(accent, 0.18),
    accentGlow: rgba(accent, 0.45),
    onAccent: luminance(accent) > 0.38 ? '#0b0b0d' : '#ffffff',
    text: '#f7f7f5',
    textMuted: 'rgb(247 247 245 / 0.62)',
    glass: 'rgb(14 14 18 / 0.42)',
    glassStrong: 'rgb(14 14 18 / 0.72)',
    hairline: 'rgb(255 255 255 / 0.12)',
    scrim: 'linear-gradient(180deg, rgb(0 0 0 / 0.45) 0%, rgb(0 0 0 / 0) 26%, rgb(0 0 0 / 0) 58%, rgb(0 0 0 / 0.6) 100%)',
  };
}

/**
 * @description Creates the free look: black background with a halftone dot field and a soft glow in the
 * chosen accent color. The dots make the magnifier effect of the main button clearly visible.
 * @param accentHex Accent color in #rrggbb format.
 * @returns Tokens for the look.
 */
export function customLookTokens(accentHex: string): LookTokens {
  const accent = parseHex(accentHex);
  return {
    ...baseTokens(accentHex),
    bg: '#050506',
    art: [
      `radial-gradient(circle at 50% 42%, ${rgba(accent, 0.28)} 0%, ${rgba(accent, 0.08)} 34%, transparent 62%)`,
      `radial-gradient(circle, ${rgba(accent, 0.5)} 1.6px, transparent 2.2px) 0 0 / 20px 20px`,
      '#050506',
    ].join(', '),
    scrim: 'linear-gradient(180deg, rgb(0 0 0 / 0.2) 0%, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0) 60%, rgb(0 0 0 / 0.5) 100%)',
    sounds: 'default',
  };
}

export function artLookTokens(theme: ArtTheme): LookTokens {
  return {
    ...baseTokens(theme.accent),
    bg: '#050506',
    art: `url('${theme.art}') center / cover no-repeat, #050506`,
    sounds: theme.sounds,
  };
}

export function tokensToCssVars(tokens: LookTokens): Readonly<Record<string, string>> {
  return {
    '--bg': tokens.bg,
    '--art': tokens.art,
    '--accent': tokens.accent,
    '--accent-soft': tokens.accentSoft,
    '--accent-glow': tokens.accentGlow,
    '--on-accent': tokens.onAccent,
    '--text': tokens.text,
    '--text-muted': tokens.textMuted,
    '--glass': tokens.glass,
    '--glass-strong': tokens.glassStrong,
    '--hairline': tokens.hairline,
    '--scrim': tokens.scrim,
  };
}
