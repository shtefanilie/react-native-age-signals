import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Android-only test surface backed by Play's FakeAgeSignalsManager.
 *
 * Declared without an `ios` platform so nitrogen emits no Swift or iOS C++ for
 * it. Apple's DeclaredAgeRange offers no injectable test double, so there is
 * nothing meaningful to implement there.
 */
export interface AgeSignalsTesting extends HybridObject<{ android: 'kotlin' }> {
  setFakeResult(ageLower?: number, ageUpper?: number): void;
  setFakeError(errorCode: number): void;
  /**
   * Stages the status the next `requestAgeSignalsAccess()` resolves with, using
   * an `AgeSignalsStatus` value.
   */
  setFakeAccessStatus(status: number): void;
  /**
   * Fails the next `requestAgeSignalsAccess()` with an `AgeSignalsErrorCode`,
   * which is a different code path from `setFakeError` — that one fails the
   * read, this one fails the consent request.
   */
  setFakeAccessError(errorCode: number): void;
  clearFake(): void;
}
