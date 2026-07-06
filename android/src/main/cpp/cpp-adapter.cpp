#include <fbjni/fbjni.h>
#include "ReactNativeAgeSignalsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [] {
    margelo::nitro::agesignals::registerAllNatives();
  });
}
