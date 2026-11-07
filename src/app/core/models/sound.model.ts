export type SoundCue = 'tap' | 'start' | 'finish' | 'lap' | 'reset' | 'toggle';

export interface SynthNote {
  readonly frequency: number;
  readonly offset: number;
  readonly duration: number;
  readonly type: OscillatorType;
  readonly gain: number;
  readonly glideTo?: number;
}

export interface SynthCueSource {
  readonly kind: 'synth';
  readonly notes: readonly SynthNote[];
}

export interface FileCueSource {
  readonly kind: 'file';
  readonly src: string;
  readonly gain: number;
}

export type CueSource = SynthCueSource | FileCueSource;

export type SoundPack = Readonly<Record<SoundCue, CueSource>>;
