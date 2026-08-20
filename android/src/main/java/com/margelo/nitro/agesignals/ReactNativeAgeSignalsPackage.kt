package com.margelo.nitro.agesignals

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Exists only to load this library's C++ part during React Native startup.
 *
 * Loading the shared library runs JNI_OnLoad, which registers every
 * HybridObject constructor with Nitro's registry. Without it,
 * `createHybridObject('AgeSignals')` has nothing to construct.
 *
 * iOS gets this for free: the nitrogen-generated autolinking objective-c file
 * registers during static initialisation. Android has no equivalent hook, so
 * the JVM side has to ask for the library explicitly, and React Native
 * instantiates autolinked packages early enough to do it.
 *
 * Deliberately contributes no native modules or view managers.
 */
class ReactNativeAgeSignalsPackage : ReactPackage {
  init {
    ReactNativeAgeSignalsOnLoad.initializeNative()
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    emptyList()

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
