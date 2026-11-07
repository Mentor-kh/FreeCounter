import { ArtTheme, ArtThemeId } from '../models/theme.model';

function artTheme(id: ArtThemeId, accent: string, scheme: ArtTheme['scheme']): ArtTheme {
  return { id, accent, scheme, art: `themes/${id}/art.webp`, thumb: `themes/${id}/thumb.webp`, sounds: id };
}

export const ART_THEMES: readonly ArtTheme[] = [
  artTheme('psychedelic', '#ff4fd8', 'dark'),
  artTheme('latte', '#f2d3a8', 'dark'),
  artTheme('nebula', '#c08bff', 'dark'),
  artTheme('matcha', '#d9f0a3', 'dark'),
  artTheme('cyber', '#3df2ff', 'dark'),
  artTheme('aurora', '#5effc1', 'dark'),
];

export function findArtTheme(id: ArtThemeId): ArtTheme | undefined {
  return ART_THEMES.find((theme) => theme.id === id);
}

export function isArtThemeId(value: unknown): value is ArtThemeId {
  return ART_THEMES.some((theme) => theme.id === value);
}
