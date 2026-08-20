import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Android-only test helpers, backed by Play's FakeAgeSignalsManager.
 *
 * There is no iOS counterpart: Apple's DeclaredAgeRange has no injectable
 * test double, so every entry point here throws on iOS rather than pretending
 * to work.
 *
 * These helpers only work in a debuggable build. The native side refuses to
 * install a fake when the host application is not debuggable, so this module
 * cannot alter behaviour in a release build.
 */
interface AgeSignalsTestingSpec extends HybridObject<{ android: 'kotlin' }> {
  setFakeResult(ageLower?: number, ageUpper?: number): void;
  setFakeError(errorCode: number): void;
  clearFake(): void;
}

/**
 * Error codes accepted by {@link setFakeError}, mirroring
 * `com.google.android.play.agesignals.model.AgeSignalsErrorCode`.
 */
export const AgeSignalsErrorCode = {
  NO_ERROR: 0,
  API_NOT_AVAILABLE: -1,
  PLAY_STORE_NOT_FOUND: -2,
  NETWORK_ERROR: -3,
  PLAY_SERVICES_NOT_FOUND: -4,
  CANNOT_BIND_TO_SERVICE: -5,
  PLAY_STORE_VERSION_OUTDATED: -6,
  PLAY_SERVICES_VERSION_OUTDATED: -7,
  CLIENT_TRANSIENT_ERROR: -8,
  APP_NOT_OWNED: -9,
  SDK_VERSION_OUTDATED: -10,
  INTERNAL_ERROR: -100,
} as const;

export type AgeSignalsErrorCodeValue =
  (typeof AgeSignalsErrorCode)[keyof typeof AgeSignalsErrorCode];

let nativeTestingModule: AgeSignalsTestingSpec | undefined;

function requireNativeTestingModule(): AgeSignalsTestingSpec {
  if (Platform.OS !== 'android') {
    throw new Error(
      `react-native-age-signals/testing is only available on Android, but was called on ${Platform.OS}. ` +
        'Apple provides no test double for DeclaredAgeRange.'
    );
  }

  nativeTestingModule ??=
    NitroModules.createHybridObject<AgeSignalsTestingSpec>('AgeSignalsTesting');

  return nativeTestingModule;
}

/**
 * Makes the next `getAgeRange()` call resolve from the given age bounds
 * instead of querying the Play Store.
 *
 * Omit a bound to report it as absent, which is how the Play Store represents
 * an open-ended range.
 */
export function setFakeResult(range: { ageLower?: number; ageUpper?: number }): void {
  requireNativeTestingModule().setFakeResult(range.ageLower, range.ageUpper);
}

/**
 * Makes the next `getAgeRange()` call fail with the given error code, which
 * surfaces to JavaScript as `{ ageRange: 'unknown', source: 'error' }`.
 */
export function setFakeError(errorCode: number): void {
  requireNativeTestingModule().setFakeError(errorCode);
}

/**
 * Removes any installed fake, restoring calls to the real Play Store client.
 */
export function clearFake(): void {
  requireNativeTestingModule().clearFake();
}
