import { ArtThemeId } from './theme.model';

export type Language = 'en' | 'ru';

export type AlertSound = 'theme' | 'system';

export type VoiceGender = 'female' | 'male';

export type VoiceStep = 1 | 10;

export interface SoundSettings {
  readonly enabled: boolean;
  readonly onTap: boolean;
  readonly alert: AlertSound;
  readonly volume: number;
}

export interface VoiceSettings {
  readonly enabled: boolean;
  readonly gender: VoiceGender;
  readonly step: VoiceStep;
}

export interface AppSettings {
  readonly version: 2;
  readonly language: Language;
  readonly accent: string;
  readonly artTheme: ArtThemeId | null;
  readonly sound: SoundSettings;
  readonly voice: VoiceSettings;
  readonly haptics: boolean;
  readonly keepAwake: boolean;
  readonly notifications: boolean;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface PermissionsSnapshot {
  readonly notifications: PermissionStatus;
  readonly exactAlarms: PermissionStatus;
}
