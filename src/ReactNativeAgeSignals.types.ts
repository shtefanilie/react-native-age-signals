export type AgeRange = 'child' | 'teen' | 'adult' | 'unknown';
export type AgeSignalSource = 'apple' | 'google' | 'unavailable';

export interface AgeSignalResult {
  ageRange: AgeRange;
  source: AgeSignalSource;
}
