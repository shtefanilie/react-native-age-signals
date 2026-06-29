export { AgeRange, AgeSignalSource, AgeSignalResult } from './ReactNativeAgeSignals.types';

import ReactNativeAgeSignalsModule from './ReactNativeAgeSignalsModule';

export function getAgeRange() {
  return ReactNativeAgeSignalsModule.getAgeRange();
}

export function isSupported() {
  return ReactNativeAgeSignalsModule.isSupported();
}
