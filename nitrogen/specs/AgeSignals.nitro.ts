import type { HybridObject } from 'react-native-nitro-modules';

export interface AgeRangeResult {
  ageRange: string;
  source: string;
  /**
   * The Play age-sharing access status this result came from, when one was
   * requested. Android only, and only set when `getAgeRange` was called with
   * `requestAccess` — a plain read leaves it undefined, because it never asks.
   */
  accessStatus?: string;
}

export interface AgeSignals
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * @param requestAccess Android only. When true, request age-sharing access
   * before reading, which is what Play's 0.0.4 SDK requires before it will
   * report any age bounds. May present Play's in-app prompt. Ignored on iOS,
   * where Apple's sheet is part of the read itself.
   */
  getAgeRange(requestAccess?: boolean): Promise<AgeRangeResult>;
  isSupported(): Promise<boolean>;
}
