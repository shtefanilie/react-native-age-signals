import { NitroModules } from 'react-native-nitro-modules';

import type { AgeSignalResult } from './ReactNativeAgeSignals.types';

interface AgeSignalsSpec {
  getAgeRange(): Promise<AgeSignalResult>;
  isSupported(): Promise<boolean>;
}

export default NitroModules.createHybridObject<AgeSignalsSpec>('AgeSignals');
