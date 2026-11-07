import { computed, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_ACCENT, STORAGE_KEYS } from '../config/app.constants';
import { isArtThemeId } from '../config/themes.catalog';
import { AppSettings, Language, SoundSettings, VoiceGender, VoiceSettings, VoiceStep } from '../models/settings.model';
import { clamp, isRecord, readBoolean, readNumber, readOneOf, UnknownRecord } from './sanitize';
import { StorageService } from './storage.service';
import { isHexColor } from './theme-factory';

const LANGUAGES: readonly Language[] = ['en', 'ru'];

function detectLanguage(): Language {
  const preferred = typeof navigator === 'undefined' ? 'en' : navigator.language.toLowerCase();
  return preferred.startsWith('ru') || preferred.startsWith('uk') ? 'ru' : 'en';
}

const DEFAULT_SOUND: SoundSettings = { enabled: true, onTap: true, alert: 'system', volume: 0.7 };

const DEFAULT_VOICE: VoiceSettings = { enabled: false, gender: 'female', step: 10 };

const GENDERS: readonly VoiceGender[] = ['female', 'male'];

function readStep(value: unknown): VoiceStep {
  return value === 1 ? 1 : 10;
}

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly storage = inject(StorageService);
  private readonly state = signal<AppSettings>(this.defaults());

  readonly settings = this.state.asReadonly();
  readonly language = computed<Language>(() => this.state().language);
  readonly sound = computed<SoundSettings>(() => this.state().sound);
  readonly voice = computed<VoiceSettings>(() => this.state().voice);

  async load(): Promise<void> {
    const stored = await this.storage.read(STORAGE_KEYS.settings, (raw) => this.sanitize(raw));
    if (stored !== null) {
      this.state.set(stored);
    }
  }

  update(patch: Partial<Omit<AppSettings, 'version' | 'sound'>>): void {
    this.state.update((s) => ({ ...s, ...patch }));
    void this.storage.write(STORAGE_KEYS.settings, this.state());
  }

  updateSound(patch: Partial<SoundSettings>): void {
    this.state.update((s) => ({ ...s, sound: { ...s.sound, ...patch } }));
    void this.storage.write(STORAGE_KEYS.settings, this.state());
  }

  updateVoice(patch: Partial<VoiceSettings>): void {
    this.state.update((s) => ({ ...s, voice: { ...s.voice, ...patch } }));
    void this.storage.write(STORAGE_KEYS.settings, this.state());
  }

  private defaults(): AppSettings {
    return {
      version: 2,
      language: detectLanguage(),
      accent: DEFAULT_ACCENT,
      artTheme: null,
      sound: DEFAULT_SOUND,
      voice: DEFAULT_VOICE,
      haptics: true,
      keepAwake: true,
      notifications: true,
    };
  }

  private sanitize(raw: unknown): AppSettings | null {
    if (!isRecord(raw)) {
      return null;
    }
    const defaults = this.defaults();
    const sound: UnknownRecord = isRecord(raw['sound']) ? raw['sound'] : {};
    const voice: UnknownRecord = isRecord(raw['voice']) ? raw['voice'] : {};
    return {
      version: 2,
      language: readOneOf(raw, 'language', LANGUAGES, defaults.language),
      accent: isHexColor(raw['accent']) ? raw['accent'] : DEFAULT_ACCENT,
      artTheme: isArtThemeId(raw['artTheme']) ? raw['artTheme'] : null,
      sound: {
        enabled: readBoolean(sound, 'enabled', DEFAULT_SOUND.enabled),
        onTap: readBoolean(sound, 'onTap', DEFAULT_SOUND.onTap),
        alert: readOneOf(sound, 'alert', ['theme', 'system'], DEFAULT_SOUND.alert),
        volume: clamp(readNumber(sound, 'volume', DEFAULT_SOUND.volume), 0, 1),
      },
      voice: {
        enabled: readBoolean(voice, 'enabled', DEFAULT_VOICE.enabled),
        gender: readOneOf(voice, 'gender', GENDERS, DEFAULT_VOICE.gender),
        step: readStep(voice['step']),
      },
      haptics: readBoolean(raw, 'haptics', defaults.haptics),
      keepAwake: readBoolean(raw, 'keepAwake', defaults.keepAwake),
      notifications: readBoolean(raw, 'notifications', defaults.notifications),
    };
  }
}
