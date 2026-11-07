import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type Sanitizer<T> = (raw: unknown) => T | null;

@Injectable({ providedIn: 'root' })
export class StorageService {
  async read<T>(key: string, sanitize: Sanitizer<T>): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      if (value === null) {
        return null;
      }
      const parsed: unknown = JSON.parse(value);
      return sanitize(parsed);
    } catch {
      return null;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    try {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } catch {
      return;
    }
  }
}
