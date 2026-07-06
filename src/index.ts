import ReactNativeAgeSignalsModule from './ReactNativeAgeSignalsModule';

export { AgeRange, AgeSignalSource, AgeSignalResult } from './ReactNativeAgeSignals.types';

export function getAgeRange() {
  return ReactNativeAgeSignalsModule.getAgeRange();
}

export function isSupported() {
  return ReactNativeAgeSignalsModule.isSupported();
}
