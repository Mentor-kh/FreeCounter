import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'node_modules/@phosphor-icons/core/assets';
const TARGET = 'src/app/shared/components/icon-paths.ts';

const ICONS = {
  up: 'arrow-fat-up',
  down: 'arrow-fat-down',
  goal: 'flag-checkered',
  undo: 'arrow-u-up-left',
  reset: 'arrow-counter-clockwise',
  play: 'play',
  pause: 'pause',
  lap: 'flag',
  tap: 'hand-tap',
  stopwatch: 'timer',
  timer: 'hourglass-medium',
  settings: 'gear-six',
  palette: 'palette',
  dice: 'dice-five',
  lock: 'lock-simple',
  check: 'check-circle',
  close: 'bold/x',
  bell: 'bell-ringing',
  sound: 'speaker-high',
  vibrate: 'vibrate',
  globe: 'globe-hemisphere-west',
  sun: 'sun',
  shield: 'shield-check',
  sparkle: 'sparkle',
  calendar: 'calendar-dots',
  crown: 'crown-simple',
  eyedropper: 'eyedropper',
  music: 'music-notes',
  trophy: 'trophy',
  heart: 'heart',
  coins: 'coins',
  external: 'arrow-square-out',
  plus: 'plus',
  mail: 'envelope-simple',
  voice: 'regular/speaker-simple-high',
  'voice-off': 'regular/speaker-simple-slash',
  'voice-female': 'regular/gender-female',
  'voice-male': 'regular/gender-male',
};

const entries = [];
for (const [name, file] of Object.entries(ICONS)) {
  const [weight, icon] = file.includes('/') ? file.split('/') : ['fill', file];
  const svg = await readFile(`${SOURCE}/${weight}/${icon}${weight === 'regular' ? '' : `-${weight}`}.svg`, 'utf8');
  const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  entries.push(`  ${/^[a-z]+$/.test(name) ? name : `'${name}'`}: '${paths.join(' ')}',`);
}

const content = `export type IconName =
${Object.keys(ICONS)
  .map((name) => `  | '${name}'`)
  .join('\n')};

export const ICON_PATHS: Readonly<Record<IconName, string>> = {
${entries.join('\n')}
};
`;

await writeFile(TARGET, content);
console.log(`${entries.length} icons written to ${TARGET}`);
