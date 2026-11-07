import { SoundPack, SynthCueSource, SynthNote } from '../models/sound.model';
import { SoundPackId } from '../models/theme.model';

function note(
  frequency: number,
  offset: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.5,
  glideTo?: number,
): SynthNote {
  return glideTo === undefined
    ? { frequency, offset, duration, type, gain }
    : { frequency, offset, duration, type, gain, glideTo };
}

function synth(...notes: SynthNote[]): SynthCueSource {
  return { kind: 'synth', notes };
}

function arpeggio(frequencies: readonly number[], gap: number, length: number, type: OscillatorType, gain: number): SynthCueSource {
  return synth(
    ...frequencies.map((f, i) => note(f, i * gap, i === frequencies.length - 1 ? length * 3 : length, type, gain)),
  );
}

const DEFAULT_PACK: SoundPack = {
  tap: synth(note(1250, 0, 0.045, 'triangle', 0.35)),
  toggle: synth(note(880, 0, 0.06, 'triangle', 0.35, 1320)),
  lap: synth(note(1500, 0, 0.08, 'sine', 0.5)),
  reset: synth(note(520, 0, 0.09, 'sine', 0.45), note(390, 0.08, 0.12, 'sine', 0.4)),
  start: synth(note(660, 0, 0.12), note(990, 0.11, 0.18)),
  finish: arpeggio([523.25, 659.25, 783.99, 1046.5], 0.14, 0.18, 'sine', 0.6),
};

export const SOUND_PACKS: Readonly<Record<SoundPackId, SoundPack>> = {
  default: DEFAULT_PACK,
  psychedelic: {
    tap: synth(note(420, 0, 0.11, 'triangle', 0.4, 980)),
    toggle: synth(note(300, 0, 0.18, 'sine', 0.45, 1200)),
    lap: synth(note(700, 0, 0.14, 'triangle', 0.4, 1400)),
    reset: synth(note(900, 0, 0.3, 'triangle', 0.4, 200)),
    start: synth(note(330, 0, 0.25, 'sine', 0.45, 880), note(660, 0.12, 0.25, 'triangle', 0.25, 1320)),
    finish: synth(
      note(392, 0, 0.5, 'triangle', 0.4, 523.25),
      note(523.25, 0.18, 0.5, 'sine', 0.45, 659.25),
      note(659.25, 0.36, 0.5, 'triangle', 0.4, 783.99),
      note(1046.5, 0.54, 1.1, 'sine', 0.5, 1174.66),
    ),
  },
  latte: {
    tap: synth(note(520, 0, 0.09, 'sine', 0.5), note(1560, 0, 0.03, 'sine', 0.12)),
    toggle: synth(note(440, 0, 0.12, 'sine', 0.45), note(660, 0.05, 0.12, 'sine', 0.35)),
    lap: synth(note(784, 0, 0.14, 'sine', 0.45)),
    reset: synth(note(392, 0, 0.16, 'sine', 0.45), note(294, 0.1, 0.2, 'sine', 0.4)),
    start: synth(note(440, 0, 0.18, 'sine', 0.5), note(554.37, 0.12, 0.24, 'sine', 0.45)),
    finish: arpeggio([440, 554.37, 659.25, 880], 0.17, 0.22, 'sine', 0.5),
  },
  nebula: {
    tap: synth(note(1046.5, 0, 0.18, 'sine', 0.35), note(2888, 0, 0.08, 'sine', 0.08)),
    toggle: synth(note(784, 0, 0.25, 'sine', 0.35), note(2163, 0, 0.1, 'sine', 0.08)),
    lap: synth(note(1318.5, 0, 0.3, 'sine', 0.4), note(3639, 0, 0.12, 'sine', 0.08)),
    reset: synth(note(659.25, 0, 0.3, 'sine', 0.4), note(493.88, 0.14, 0.4, 'sine', 0.35)),
    start: synth(note(659.25, 0, 0.35, 'sine', 0.4), note(987.77, 0.16, 0.45, 'sine', 0.4)),
    finish: arpeggio([659.25, 830.61, 987.77, 1318.5, 1661.2], 0.12, 0.3, 'sine', 0.45),
  },
  matcha: {
    tap: synth(note(740, 0, 0.05, 'triangle', 0.45), note(370, 0, 0.04, 'sine', 0.2)),
    toggle: synth(note(587.33, 0, 0.07, 'triangle', 0.4), note(880, 0.06, 0.08, 'triangle', 0.35)),
    lap: synth(note(987.77, 0, 0.08, 'triangle', 0.45)),
    reset: synth(note(493.88, 0, 0.08, 'triangle', 0.45), note(369.99, 0.07, 0.1, 'triangle', 0.4)),
    start: synth(note(587.33, 0, 0.09, 'triangle', 0.45), note(739.99, 0.08, 0.14, 'triangle', 0.45)),
    finish: arpeggio([587.33, 739.99, 880, 1174.66], 0.12, 0.14, 'triangle', 0.5),
  },
  cyber: {
    tap: synth(note(1760, 0, 0.035, 'square', 0.16)),
    toggle: synth(note(880, 0, 0.05, 'square', 0.16), note(1760, 0.05, 0.05, 'square', 0.16)),
    lap: synth(note(2093, 0, 0.06, 'square', 0.16)),
    reset: synth(note(1760, 0, 0.18, 'sawtooth', 0.14, 220)),
    start: synth(note(440, 0, 0.06, 'square', 0.16), note(880, 0.07, 0.06, 'square', 0.16), note(1760, 0.14, 0.1, 'square', 0.16)),
    finish: arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98], 0.08, 0.08, 'square', 0.16),
  },
  aurora: {
    tap: synth(note(1567.98, 0, 0.22, 'sine', 0.22)),
    toggle: synth(note(1174.66, 0, 0.3, 'sine', 0.25, 1567.98)),
    lap: synth(note(1975.5, 0, 0.35, 'sine', 0.25)),
    reset: synth(note(1174.66, 0, 0.4, 'sine', 0.3, 587.33)),
    start: synth(note(880, 0, 0.5, 'sine', 0.3), note(1318.5, 0.2, 0.6, 'sine', 0.25)),
    finish: arpeggio([880, 1108.73, 1318.5, 1760, 2217.46], 0.16, 0.35, 'sine', 0.3),
  },
};
