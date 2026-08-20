import { requireNativeModule } from './ReactNativeAgeSignalsModule';

export { AgeRange, AgeSignalSource, AgeSignalResult } from './ReactNativeAgeSignals.types';

export function getAgeRange() {
  return requireNativeModule().getAgeRange();
}

export function isSupported() {
  return requireNativeModule().isSupported();
}
