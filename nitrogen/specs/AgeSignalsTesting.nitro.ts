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
  clearFake(): void;
}
