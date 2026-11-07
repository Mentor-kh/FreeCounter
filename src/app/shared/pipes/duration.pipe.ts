import { Pipe, PipeTransform } from '@angular/core';

export type DurationFormat = 'clock' | 'precise';

export function formatDuration(ms: number, format: DurationFormat = 'clock'): string {
  const safe = Math.max(0, ms);
  const totalSeconds = format === 'clock' ? Math.ceil(safe / 1000) : Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const main = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  if (format === 'clock') {
    return main;
  }
  return `${main}.${pad(Math.floor((safe % 1000) / 10))}`;
}

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(ms: number, format: DurationFormat = 'clock'): string {
    return formatDuration(ms, format);
  }
}
