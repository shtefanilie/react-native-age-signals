import type { HybridObject } from 'react-native-nitro-modules';

export interface AgeRangeResult {
  ageRange: string;
  source: string;
}

export interface AgeSignals
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getAgeRange(): Promise<AgeRangeResult>;
  isSupported(): Promise<boolean>;
}
