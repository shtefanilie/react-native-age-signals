cmake_minimum_required(VERSION 3.22.1)
project(ReactNativeAgeSignals)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)

add_library(
  ReactNativeAgeSignals
  SHARED
  src/main/cpp/cpp-adapter.cpp
)

# Include nitrogen-generated autolinking cmake
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/ReactNativeAgeSignals+autolinking.cmake)

target_link_libraries(
  ReactNativeAgeSignals
  android
  log
)
