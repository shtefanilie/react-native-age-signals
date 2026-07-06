import { NitroModules } from 'react-native-nitro-modules';
import type { HybridObject } from 'react-native-nitro-modules';

import type { AgeSignalResult } from './ReactNativeAgeSignals.types';

interface AgeSignalsSpec extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getAgeRange(): Promise<AgeSignalResult>;
  isSupported(): Promise<boolean>;
}

export default NitroModules.createHybridObject<AgeSignalsSpec>('AgeSignals');
