import { NativeModule, requireNativeModule } from 'expo';

import { AgeSignalResult } from './ReactNativeAgeSignals.types';

declare class ReactNativeAgeSignalsModule extends NativeModule {
  getAgeRange(): Promise<AgeSignalResult>;
  isSupported(): Promise<boolean>;
}

export default requireNativeModule<ReactNativeAgeSignalsModule>('ReactNativeAgeSignals');
