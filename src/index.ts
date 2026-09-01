import { Platform } from 'react-native';

import type { AgeAccessStatus, GetAgeRangeOptions } from './ReactNativeAgeSignals.types';
import { requireNativeAccessModule, requireNativeModule } from './ReactNativeAgeSignalsModule';

export {
  AgeRange,
  AgeAccessStatus,
  AgeSignalSource,
  AgeSignalResult,
  GetAgeRangeOptions,
} from './ReactNativeAgeSignals.types';

/**
 * Reads the platform's knowledge of the user's age bracket.
 *
 * Pass `{ requestAccess: true }` on Android to request age-sharing access first,
 * which Play's 0.0.4 SDK requires before it reports any age bounds. Without it, a
 * user who has not already opted into sharing always reads as `unknown`.
 *
 * Resolves rather than rejecting when the platform API fails, so a failure arrives
 * as `{ ageRange: 'unknown', source: 'unavailable' | 'error' }`.
 */
export function getAgeRange(options?: GetAgeRangeOptions) {
  return requireNativeModule().getAgeRange(options?.requestAccess);
}

/**
 * Requests age-sharing access from Play. **Android only.**
 *
 * Returns what Play decided, which is worth knowing on its own: a
 * `verificationRequired` status is the cue to point the user at the Play Store,
 * and `notShared` tells you a read will not produce an age range.
 *
 * May present Play's in-app prompt — see {@link GetAgeRangeOptions.requestAccess}
 * for exactly when.
 *
 * Resolves `'unavailable'` on other platforms rather than throwing, so callers need
 * no `Platform.OS` guard. Apple has no separate consent step: its sheet is part of
 * `getAgeRange` itself.
 */
export function requestAgeSignalsAccess(): Promise<AgeAccessStatus> {
  if (Platform.OS !== 'android') {
    return Promise.resolve('unavailable');
  }

  return requireNativeAccessModule().requestAgeSignalsAccess();
}

export function isSupported() {
  return requireNativeModule().isSupported();
}
