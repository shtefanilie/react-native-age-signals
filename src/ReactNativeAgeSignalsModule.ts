import { NitroModules } from 'react-native-nitro-modules';
import type { HybridObject } from 'react-native-nitro-modules';

import type { AgeSignalResult } from './ReactNativeAgeSignals.types';

interface AgeSignalsSpec extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getAgeRange(): Promise<AgeSignalResult>;
  isSupported(): Promise<boolean>;
}

let nativeModule: AgeSignalsSpec | undefined;
let hasWarnedAboutFailure = false;

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
  if (nativeModule) {
    return nativeModule;
  }

  try {
    nativeModule = NitroModules.createHybridObject<AgeSignalsSpec>('AgeSignals');
  } catch (error) {
    // Deferring construction means a broken native build no longer crashes at
    // boot, so without this the only symptom is every result quietly becoming
    // `source: 'error'` — which is indistinguishable from the platform simply
    // having no age signal to give. Warn so the build problem stays visible.
    //
    // Warned once rather than per call: the failure is not transient (the
    // HybridObject is registered at startup or never), so repeating it would
    // only bury the first occurrence.
    if (!hasWarnedAboutFailure) {
      hasWarnedAboutFailure = true;
      console.warn(
        '[react-native-age-signals] Could not create the native "AgeSignals" HybridObject. ' +
          'Age signals will be unavailable for the rest of this session. This usually means the ' +
          'native side was not registered — rebuild the app (and on iOS re-run pod install) after ' +
          'installing or upgrading this package.',
        error
      );
    }

    throw error;
  }

  return nativeModule;
}
