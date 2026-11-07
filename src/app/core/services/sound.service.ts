import { inject, Injectable } from '@angular/core';
import { SOUND_PACKS } from '../config/sound-packs';
import { CueSource, FileCueSource, SoundCue, SynthNote } from '../models/sound.model';
import { SettingsStore } from './settings.store';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly settings = inject(SettingsStore);
  private readonly theme = inject(ThemeService);
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private context: AudioContext | null = null;

  play(cue: SoundCue, force = false): void {
    const sound = this.settings.sound();
    if (!force && !this.isEnabled(cue)) {
      return;
    }
    const ctx = this.ensureContext();
    if (ctx === null) {
      return;
    }
    const master = ctx.createGain();
    master.gain.value = sound.volume;
    master.connect(ctx.destination);
    this.playSource(ctx, master, SOUND_PACKS[this.theme.tokens().sounds][cue]);
  }

  private isEnabled(cue: SoundCue): boolean {
    const sound = this.settings.sound();
    if (!sound.enabled || sound.volume <= 0) {
      return false;
    }
    return cue === 'tap' || cue === 'toggle' ? sound.onTap : true;
  }

  private playSource(ctx: AudioContext, output: AudioNode, source: CueSource): void {
    if (source.kind === 'file') {
      void this.playFile(ctx, output, source);
      return;
    }
    const start = ctx.currentTime + 0.01;
    for (const note of source.notes) {
      this.playNote(ctx, output, note, start);
    }
  }

  private async playFile(ctx: AudioContext, output: AudioNode, source: FileCueSource): Promise<void> {
    const buffer = await this.loadBuffer(ctx, source.src);
    if (buffer === null) {
      return;
    }
    const node = ctx.createBufferSource();
    const gain = ctx.createGain();
    node.buffer = buffer;
    gain.gain.value = source.gain;
    node.connect(gain).connect(output);
    node.start();
  }

  private loadBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer | null> {
    let pending = this.buffers.get(src);
    if (pending === undefined) {
      pending = fetch(src)
        .then((response) => response.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => null);
      this.buffers.set(src, pending);
    }
    return pending;
  }

  private playNote(ctx: AudioContext, output: AudioNode, note: SynthNote, start: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = start + note.offset;
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.frequency, t0);
    if (note.glideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(note.glideTo, t0 + note.duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(note.gain, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.duration);
    osc.connect(gain).connect(output);
    osc.start(t0);
    osc.stop(t0 + note.duration + 0.02);
  }

  private ensureContext(): AudioContext | null {
    if (typeof AudioContext === 'undefined') {
      return null;
    }
    this.context ??= new AudioContext({ latencyHint: 'interactive' });
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }
}
