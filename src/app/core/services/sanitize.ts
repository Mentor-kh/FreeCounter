export type UnknownRecord = Readonly<Record<string, unknown>>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readNumber(source: UnknownRecord, key: string, fallback: number): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readNullableNumber(source: UnknownRecord, key: string): number | null {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readString(source: UnknownRecord, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : fallback;
}

export function readBoolean(source: UnknownRecord, key: string, fallback: boolean): boolean {
  const value = source[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function readArray(source: UnknownRecord, key: string): readonly unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

export function readOneOf<T extends string>(
  source: UnknownRecord,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = source[key];
  return allowed.find((option) => option === value) ?? fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
