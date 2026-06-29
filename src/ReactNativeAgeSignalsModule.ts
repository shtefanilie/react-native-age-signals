import { NativeModule, requireNativeModule } from 'expo';

declare class ReactNativeAgeSignalsModule extends NativeModule<{}> {}

export default requireNativeModule<ReactNativeAgeSignalsModule>('ReactNativeAgeSignals');
