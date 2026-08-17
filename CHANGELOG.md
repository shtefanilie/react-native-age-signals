# Changelog

## 0.4.0 — 2026-08-17

The Android side of this library had never compiled, so nothing it did on Android had ever run. This release makes it work, and adds a way to test it.

### Fixed

- **Android never built.** Six defects, each hiding the next: the nitro dependency was declared as a maven coordinate that is not published anywhere; `appContext.reactContext` is not part of the nitro API; fbjni and react-android were never declared, so the generated spec's `HybridData` and `DoNotStrip` references went unresolved; `buildFeatures.prefab` was off, so the generated `find_package` calls could not resolve; the generated glue came from `nitrogen` 0.31.10 while the runtime resolved to 0.36.1, whose `HybridObject` no longer has `updateNative`; and nitro 0.36 headers require C++20 rather than C++17.
- **Android HybridObjects were never registered.** Nothing called `System.loadLibrary`, because the library shipped no `ReactPackage` and declared no `packageImportPath`, so `createHybridObject('AgeSignals')` produced `undefined` and every call failed with `Cannot read property 'isSupported' of undefined`. iOS was unaffected — there the generated autolinking file registers during static initialisation.
- **Android results silently degraded to `unknown`.** The bucket was derived from `AgeSignalsResult.userStatus()`, whose backing IPC key (`user.status`) age-signals 0.0.4 replaced with `age.range.source`. Against a Play Store that no longer sends the old key, every result fell through to `unknown` with no error. Buckets now come from `ageLower`/`ageUpper`, whose keys are unchanged between 0.0.3 and 0.0.4.
- **The platforms disagreed on age boundaries.** Android used under-13/13–17/18+ while iOS used under-14/14–18/19+, so a 13-year-old was `child` on iOS and `teen` on Android. Both now use child under 13, teen 13–17, adult 18+, matching the `ageGates: 13, 18` passed to Apple.
- **`source: 'error'` was unreachable on Android.** `getAgeRange()` rejected there while iOS resolved with `source: 'error'`. Both now resolve, so the declared `AgeSignalSource` union is finally honest.
- **The native library was not 16 KB page size compatible.** `libReactNativeAgeSignals.so` had 4 KB aligned LOAD segments, pulling every consuming app into page size compatibility mode on Android 15+. Now built with flexible page sizes.
- iOS: replaced `UIApplication.shared.keyWindow`, deprecated since iOS 13 and unaware of multi-scene apps, with a `connectedScenes` lookup.

### Added

- `react-native-age-signals/testing` — Android-only helpers backed by Play's `FakeAgeSignalsManager`: `setFakeResult({ ageLower, ageUpper })`, `setFakeError(code)`, `clearFake()`, plus the `AgeSignalsErrorCode` constants. Refuses to run in a non-debuggable build, checked natively, so a release build cannot have its age signals replaced. Throws on iOS, which has no injectable test double. See the README.
- A package `exports` map, so the `testing` subpath resolves. `main` and `types` are retained for older resolvers.

### Changed

- Regenerated the nitro glue against nitro **0.36.x** (`nitrogen`/`react-native-nitro-modules` `0.36.1`), up from `0.31.10`. Match your host app's nitro line as described in the README.
- `compileSdk` raised from 34 to 36.
- `nitro.json` autolinking now uses the per-platform shape, which is what expresses an Android-only HybridObject and silences nitrogen's deprecation warning.

Consumers must re-run `pod install` (iOS) / sync gradle (Android) after upgrading.

## 0.3.1 — 2026-08-13

- **Fixed:** the HybridObject was never registered with Nitro's `HybridObjectRegistry`, so `createHybridObject('AgeSignals')` threw `Cannot create an instance of HybridObject "AgeSignals" - It has not yet been registered` on both platforms. The `autolinking` block in `nitro.json` used an invented nested per-platform shape; nitrogen parses its config with a non-strict schema, so the unrecognised keys were silently dropped and no registration code was emitted. It now uses the documented shape — keyed by HybridObject name, with `swift`/`kotlin` implementation class names.
- Regenerated the Nitro glue as a result: `ReactNativeAgeSignalsOnLoad.cpp` now contains the Android registration call, and `ReactNativeAgeSignalsAutolinking.mm` / `ReactNativeAgeSignalsAutolinking.swift` are emitted for iOS.
- No source or public API changes. Consumers must re-run `pod install` (iOS) / sync gradle (Android) after upgrading.

## 0.3.0 — 2026-08-10

- **Nitro compatibility:** regenerated the Nitro glue against the `0.31.x` runtime line (`nitrogen`/`react-native-nitro-modules` pinned to `0.31.10`) so the module loads under hosts on that line. See the nitro-runtime compatibility note in the README.
- iOS: lowered the podspec deployment target to `15.1` (the `DeclaredAgeRange` framework is already weak-linked; hosts below iOS 26 return `unknown`). No consumer deployment-target bump required.
- Synced native version strings — podspec and `android/build.gradle` now track `0.3.0` from `package.json`.

## 0.1.0 — 2026-06-29

Initial release.

- iOS: `DeclaredAgeRange` (StoreKit) — returns `child`, `teen`, `adult`, or `unknown`
- Android: Google Play Age Signals (`com.google.android.play:age-signals:0.0.3`)
- `getAgeRange()` — async, returns `{ ageRange, source }`
- `isSupported()` — check platform availability before calling
