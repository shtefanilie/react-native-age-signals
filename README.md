# react-native-age-signals

[![CI](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml/badge.svg)](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-age-signals)](https://www.npmjs.com/package/react-native-age-signals)
![iOS 26+](https://img.shields.io/badge/iOS-26%2B-black?logo=apple)
![Android API 24+](https://img.shields.io/badge/Android-API%2024%2B-3ddc84?logo=android&logoColor=white)

Ask the app store what age bracket the current user is in. One call, one answer, both platforms.

- **iOS** — Apple [`DeclaredAgeRange`](https://developer.apple.com/documentation/declaredagerange/) (iOS 26+)
- **Android** — [Google Play Age Signals](https://developer.android.com/google/play/age-signals/overview) `0.0.4`

Built on [Nitro Modules](https://nitro.margelo.com) for near-zero JSI overhead. Works in bare React Native and in Expo with a [dev client](https://docs.expo.dev/develop/development-builds/introduction/) — **not Expo Go**, which cannot load custom native modules.

**What it is not.** It does not verify anyone's age — it reports what the store already knows. It does not gate your content; it hands you a bracket and you decide. It stores nothing, so caching is yours to choose. And it is not legal advice about which regimes apply to you.

## Demo

![demo](https://raw.githubusercontent.com/shtefanilie/react-native-age-signals/main/assets/demo.gif)

## Install

```sh
npm install react-native-age-signals react-native-nitro-modules
```

**iOS** — `cd ios && pod install`, then enable the **Declared Age Range** capability:

1. Add `com.apple.developer.declared-age-range` to your app's `.entitlements` file.
2. Enable the capability on your App ID in the Apple Developer portal and regenerate provisioning profiles.

Self-serve — no Apple review. Without it, every call returns `unavailable`. The framework itself is weak-linked automatically, so iOS 15.1–25 still launch fine.

**Android** — nothing to do. Play Age Signals and its manifest entries resolve through Gradle.

Rebuild the app after installing — a JS reload cannot pick up a new native module. If the build or the first call fails, see [Troubleshooting](#troubleshooting).

## Quickstart

```ts
import { getAgeRange } from 'react-native-age-signals';

const { ageRange, source } = await getAgeRange({ requestAccess: true });
// ageRange: 'child' | 'teen' | 'adult' | 'unknown'
```

`requestAccess` asks Android for age-sharing consent, which Play requires before it reports any age bounds — without it, anyone who has not already opted in reads as `unknown`. It may present [Play's prompt](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#when-play-shows-a-prompt), which is why it is opt-in rather than the default. On iOS it is ignored: Apple's sheet is already part of the call.

It never throws. A platform failure arrives as a [`source`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#results) you can act on — and `source` also tells you whether the result is safe to cache.

**Try it** — [`example/`](example) is a runnable app that calls both entry points and shows the raw result:

```sh
cd example && npm install
npm run ios   # or: npm run android
```

## API at a glance

| Export                             | Does                                                                   | Reference                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `getAgeRange(options?)`            | Reads the user's age bracket                                           | [`getAgeRange`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#getagerange)                         |
| `requestAgeSignalsAccess()`        | Asks Android for consent and tells you what Play decided. Android only | [`requestAgeSignalsAccess`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#requestagesignalsaccess) |
| `isSupported()`                    | Whether the API exists on this device. You rarely need it              | [`isSupported`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#issupported)                         |
| `react-native-age-signals/testing` | Stages fake Play responses on an emulator                              | [Testing on Android](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#testing-on-android)             |

Full semantics, result shape, caching rules and platform edge cases: **[API reference →](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md)**

## Compared to `react-native-play-age-range-declaration`

|                         | `react-native-age-signals`                                                               | [`react-native-play-age-range-declaration`](https://www.npmjs.com/package/react-native-play-age-range-declaration) |
| ----------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Consent prompt          | Opt-in per call (`requestAccess`)                                                        | Every Play read requests access                                                                                    |
| Consent status          | 5 states exposed (`shared`, `notShared`, `verificationRequired`, `unavailable`, `error`) | Not exposed — a non-shared read returns an empty result                                                            |
| Retry guidance          | `unavailable` (terminal) vs `error` (transient)                                          | Single `error?: string`                                                                                            |
| Result shape            | Buckets: `child` / `teen` / `adult` / `unknown`                                          | Raw bounds + `getIsConsideredOlderThan(n)`                                                                         |
| Setup before first call | None                                                                                     | `setAgeRangeThresholds([...])` required on iOS                                                                     |
| Test doubles            | `/testing` subpath, native debug-only gate                                               | Main entry, callable in release builds                                                                             |
| Install size            | 42 kB packed, 71 files                                                                   | 708 kB unpacked                                                                                                    |
| Stores                  | Apple App Store, Google Play                                                             | + Amazon Appstore, Samsung Galaxy Store                                                                            |
| Custom age gates        | Fixed at 13 / 18                                                                         | Configurable, up to 3 thresholds                                                                                   |
| iOS minimum             | 26.0                                                                                     | 26.2                                                                                                               |
| Play Age Signals SDK    | `0.0.4`                                                                                  | `0.0.4`                                                                                                            |

## Upgrading from `0.4.x`

`0.5.0` moved Android onto Play Age Signals `0.0.4`, which requires an explicit consent step before it will report an age range. **Nothing you have written stops compiling, and nothing starts prompting on its own** — but on Android you now have to opt in to get a signal.

- Re-run `pod install` (iOS) and resync Gradle (Android) — the generated Nitro glue changed.
- Add `{ requestAccess: true }` on Android if you want the age range. Without it, anyone who has not already opted into sharing reads as `unknown`.
- If you persist results, two values changed meaning: `declined` is broader on Android, and `verificationRequired` now reports `source: 'error'`.

Full detail, including why the SDK bump was not optional: **[CHANGELOG → `0.5.0`](CHANGELOG.md)**

## Troubleshooting

### Build and startup

| Symptom                                                                             | Cause                                                                                                                                         | Fix                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HybridObject "AgeSignals" has not yet been registered in the HybridObjectRegistry` | The native side never registered. Usually the app was not rebuilt, or `pod install` was not re-run after installing                           | Re-run `pod install` on iOS, resync Gradle on Android, then **rebuild the app** — not a JS reload                                                                                           |
| Same error, but only in Expo Go                                                     | Expo Go ships a fixed set of native modules and cannot load this one                                                                          | Use an [Expo dev client](https://docs.expo.dev/develop/development-builds/introduction/) or `expo prebuild`                                                                                 |
| `Unresolved reference 'updateNative'` during `compileDebugKotlin`                   | Your app resolved a `react-native-nitro-modules` version this package's generated glue was not built against — typically `0.36.x` vs `0.31.x` | Install `react-native-nitro-modules@^0.31.10`. Widening the peer range does not help: the glue is compiled against one nitro native API and has to be regenerated to change it              |
| A wall of undefined `margelo::nitro::*` symbols when linking on Android             | This library and nitro built different ABI sets, so nitro published no prefab for an ABI this library tried to link                           | Set `reactNativeArchitectures` in `android/gradle.properties` — this library and nitro both read that one root property. Check nothing overrides `abiFilters` in a module's own Gradle file |

### Results that look wrong

| Symptom                                                          | Cause                                                                                           | Fix                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every iOS call returns `source: 'unavailable'` on iOS 26+        | The **Declared Age Range** capability is missing from the build                                 | See [Install](#install). Check the built app's entitlements actually contain `com.apple.developer.declared-age-range`                                                               |
| Android always returns `ageRange: 'unknown'`, `source: 'google'` | Consent was never requested, so Play reports no bounds                                          | Pass `{ requestAccess: true }`, or call `requestAgeSignalsAccess()` first                                                                                                           |
| Android returns `unknown` on an emulator no matter what          | An emulator's Play Store has no age bounds to report                                            | Expected. Use the [testing helpers](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#testing-on-android)                                               |
| `source: 'error'` with no visible reason                         | The result carries no error detail by design                                                    | Read the native log — `log stream --predicate 'subsystem == "react-native-age-signals"'` on iOS, `adb logcat -s AgeSignals` on Android                                              |
| Testing helpers throw                                            | They are Android-only and debug-only — the native side reads `ApplicationInfo.FLAG_DEBUGGABLE`  | Run a debuggable Android build. There is no iOS equivalent to enable                                                                                                                |
| `Timeouted: Promise<bool> was destroyed!`                        | Something created the hybrid object directly and did not retain it, so it was freed mid-promise | Call the exported functions, which hold a module-level reference. If you must use `NitroModules.createHybridObject` (e.g. over CDP), assign it to a variable that outlives the call |

## Platform support

| Platform | Min version | Notes                                                                                                                                                                                  |
| -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | 26.0        | `DeclaredAgeRange`. Requires the [Declared Age Range entitlement](#install) and presents a system age-sharing sheet                                                                    |
| Android  | API 24      | Requires the Google Play Store. Age sharing needs an explicit [consent request](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#requestagesignalsaccess) |

Requires React Native 0.75+ and `react-native-nitro-modules` `^0.31.10`. iOS deployment target can be as low as 15.1 — the framework is weak-linked, and older versions return `unknown`.

`unknown` is a common and expected result. Users may decline, not have set an age, be on an unsupported OS version, or on Android simply not have granted age sharing.

## Background

The [Texas App Store Accountability Act](https://capitol.texas.gov/) requires apps to query platform age signal APIs to determine whether a user is a child. Apple and Google each provide a native API for this; this library wraps both behind one cross-platform call.

## License

MIT
