import { NitroModules } from 'react-native-nitro-modules';
import type { HybridObject } from 'react-native-nitro-modules';

import type { AgeSignalResult } from './ReactNativeAgeSignals.types';

interface AgeSignalsSpec extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getAgeRange(): Promise<AgeSignalResult>;
  isSupported(): Promise<boolean>;
}

let nativeModule: AgeSignalsSpec | undefined;

/**
 * Resolves the native AgeSignals object, constructing it on first use.
 *
 * Constructed lazily rather than at module scope: `createHybridObject` throws
 * when the HybridObject was never registered, and at module scope that throw
 * happens while the importing module is still evaluating. In a host app whose
 * import chain reaches this package from a screen, that takes the app down at
 * boot instead of reaching the caller's try/catch, where a registration failure
 * would otherwise surface as an ordinary rejected promise.
 *
 * Memoized at module scope deliberately, not per call. Nitro destroys an
 * unretained HybridObject while its promise is still pending and then rejects
 * with "Timeouted: Promise<bool> was destroyed!", so every caller has to share
 * one retained instance.
 *
 * Mirrors `requireNativeTestingModule` in ./testing.
 */
export function requireNativeModule(): AgeSignalsSpec {
  nativeModule ??= NitroModules.createHybridObject<AgeSignalsSpec>('AgeSignals');

  return nativeModule;
}
