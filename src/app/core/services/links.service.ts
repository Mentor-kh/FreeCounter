import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class LinksService {
  /**
   * @description Opens a web page in an in-app browser sheet (Chrome Custom Tab) on Android,
   * or in a new tab on the web, so the user stays in the app.
   * @param url Absolute URL to open.
   */
  async open(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url, presentationStyle: 'popover' }).catch(() => undefined);
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  /**
   * @description Opens the user's email app with a prepared message. Nothing is sent by the app itself.
   * @param to Recipient address.
   * @param subject Subject line.
   * @param body Message text.
   */
  mail(to: string, subject: string, body: string): void {
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
