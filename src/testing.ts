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
  setFakeAccessStatus(status: number): void;
  setFakeAccessError(errorCode: number): void;
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

/**
 * Sharing statuses accepted by {@link setFakeAccessStatus}, mirroring
 * `com.google.android.play.agesignals.model.AgeSignalsStatus`.
 *
 * These cross into native as plain integers, so the values matter: they are read
 * from the `age-signals` 0.0.4 AAR rather than assumed.
 *
 * `UNSPECIFIED` is included because Play can return it, and it is worth being able
 * to exercise — the module reports it as a retryable error rather than treating it
 * as a refusal.
 */
export const AgeSignalsStatus = {
  UNSPECIFIED: 0,
  SHARED: 1,
  NOT_SHARED: 2,
  VERIFICATION_REQUIRED: 3,
} as const;

export type AgeSignalsStatusValue = (typeof AgeSignalsStatus)[keyof typeof AgeSignalsStatus];

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
 * Makes the next `requestAgeSignalsAccess()` — and the access step inside
 * `getAgeRange({ requestAccess: true })` — resolve with the given status.
 *
 * Staged independently of {@link setFakeResult} / {@link setFakeError}, because
 * Play's two calls are separate: a read only reports age bounds once access says
 * `SHARED`. Exercising the opt-in path end to end therefore needs both, for
 * example:
 *
 * ```ts
 * setFakeAccessStatus(AgeSignalsStatus.SHARED);
 * setFakeResult({ ageLower: 13, ageUpper: 17 });
 * await getAgeRange({ requestAccess: true }); // teen, source google, accessStatus shared
 * ```
 *
 * A non-`SHARED` status short-circuits the read, so the staged result is not
 * consulted at all.
 */
export function setFakeAccessStatus(status: number): void {
  requireNativeTestingModule().setFakeAccessStatus(status);
}

/**
 * Makes the next access request fail with the given `AgeSignalsErrorCode`.
 *
 * A different code path from {@link setFakeError}, which fails the *read*. Use
 * this to exercise how a failed consent request is classified: terminal codes
 * surface as `accessStatus: 'unavailable'`, everything else as `'error'`.
 */
export function setFakeAccessError(errorCode: number): void {
  requireNativeTestingModule().setFakeAccessError(errorCode);
}

/**
 * Removes any installed fake, restoring calls to the real Play Store client.
 *
 * Clears both the read and the access staging, so this is what to call between
 * scenarios.
 */
export function clearFake(): void {
  requireNativeTestingModule().clearFake();
}
