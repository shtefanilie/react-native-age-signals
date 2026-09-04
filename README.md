# react-native-age-signals

[![CI](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml/badge.svg)](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-age-signals)](https://www.npmjs.com/package/react-native-age-signals)
![iOS 26+](https://img.shields.io/badge/iOS-26%2B-black?logo=apple)
![Android API 24+](https://img.shields.io/badge/Android-API%2024%2B-3ddc84?logo=android&logoColor=white)

Ask the app store what age bracket the current user is in. One call, one answer, both platforms.

- **iOS** — Apple [`DeclaredAgeRange`](https://developer.apple.com/documentation/declaredagerange/) (iOS 26+)
- **Android** — [Google Play Age Signals](https://developer.android.com/google/play/age-signals/overview) `0.0.4`

Built on [Nitro Modules](https://nitro.margelo.com) for near-zero JSI overhead. Works in Expo and bare React Native.

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

## Quickstart

```ts
import { getAgeRange } from 'react-native-age-signals';

const { ageRange, source } = await getAgeRange({ requestAccess: true });
// ageRange: 'child' | 'teen' | 'adult' | 'unknown'
```

`requestAccess` asks Android for age-sharing consent, which Play requires before it reports any age bounds — without it, anyone who has not already opted in reads as `unknown`. It may present [Play's prompt](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#when-play-shows-a-prompt), which is why it is opt-in rather than the default. On iOS it is ignored: Apple's sheet is already part of the call.

It never throws. A platform failure arrives as a [`source`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#results) you can act on — and `source` also tells you whether the result is safe to cache.

## API at a glance

| Export                             | Does                                                                   | Reference                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `getAgeRange(options?)`            | Reads the user's age bracket                                           | [`getAgeRange`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#getagerange)                         |
| `requestAgeSignalsAccess()`        | Asks Android for consent and tells you what Play decided. Android only | [`requestAgeSignalsAccess`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#requestagesignalsaccess) |
| `isSupported()`                    | Whether the API exists on this device. You rarely need it              | [`isSupported`](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#issupported)                         |
| `react-native-age-signals/testing` | Stages fake Play responses on an emulator                              | [Testing on Android](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#testing-on-android)             |

Full semantics, result shape, caching rules and platform edge cases: **[API reference →](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md)**

## Compared to `react-native-play-age-range-declaration`

|                                         | `react-native-age-signals`                                                                             | [`react-native-play-age-range-declaration`](https://www.npmjs.com/package/react-native-play-age-range-declaration) |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Consent prompt                          | Opt-in per call (`requestAccess`)                                                        | Every Play read requests access                                                                                    |
| Consent status                          | 5 states exposed (`shared`, `notShared`, `verificationRequired`, `unavailable`, `error`) | Not exposed — a non-shared read returns an empty result                                                            |
| Retry guidance                          | `unavailable` (terminal) vs `error` (transient)                                          | Single `error?: string`                                                                                            |
| Result shape                            | Buckets: `child` / `teen` / `adult` / `unknown`                                          | Raw bounds + `getIsConsideredOlderThan(n)`                                                                         |
| Setup before first call                 | None                                                                                     | `setAgeRangeThresholds([...])` required on iOS                                                                     |
| Test doubles                            | `/testing` subpath, native debug-only gate                                               | Main entry, callable in release builds                                                                             |
| Install size                            | 42 kB packed, 71 files                                                                   | 708 kB unpacked                                                                                                    |
| Stores                                  | Apple App Store, Google Play                                                             | + Amazon Appstore, Samsung Galaxy Store                                                                            |
| Custom age gates                        | Fixed at 13 / 18                                                                         | Configurable, up to 3 thresholds                                                                                   |
| iOS minimum                             | 26.0                                                                                     | 26.2                                                                                                               |
| Play Age Signals SDK                    | `0.0.4`                                                                                  | `0.0.4`                                                                                                            |

## Migrating to `0.5.0`

`0.5.0` moves Android onto Play Age Signals `0.0.4`, which requires an explicit consent step before it will report an age range.

**Nothing you have written stops compiling, and nothing starts prompting on its own.** But on Android you now have to opt in to get a signal for users who have not already enabled age sharing.

- **Re-run `pod install` (iOS) and sync Gradle (Android).** The generated Nitro glue changed.
- **Nothing to change to keep building.** `getAgeRange()` still takes no arguments, and `AgeSignalSource` is unchanged — no new union member, so exhaustive `switch` statements and `Record<AgeSignalSource, T>` maps still typecheck.
- **On Android, add `{ requestAccess: true }` if you want the age range.** Without it, any user who has not already opted into age sharing reads as `{ ageRange: 'unknown', source: 'google' }`. This is the one change that actually matters.
- **iOS is unaffected.** Apple's sheet is still part of `getAgeRange()`; `requestAccess` is ignored there.
- **Call it where an Activity is in the foreground.** Consent cannot be requested from the background; it reports `source: 'error'` if none is available.
- **Android's documented minimum is now API 24**, correcting an earlier README. The Gradle config always required 24.

### If you persist results, check two things

**1. `declined` is broader on Android.** It used to appear only on iOS, where it means the user dismissed Apple's sheet. It now also covers Android's `NOT_SHARED`, which conflates a declined prompt, a "never share" setting, a parent's decision in Family Link, and a prompt Play has suppressed. See [Caching `declined` on Android](https://github.com/shtefanilie/react-native-age-signals/blob/main/docs/api.md#caching-declined-on-android).

**2. A new state reports `source: 'error'`.** When age verification is legally required and the user has not completed it, you get `source: 'error'` with `accessStatus: 'verificationRequired'`. Nothing failed — but the user can resolve it in the Play Store, so it must stay retryable. If your caching logic keys off `source` this already behaves correctly. If you log every `error` as a failure, expect some benign noise, and switch on `accessStatus` to tell the two apart.

### Why the SDK bump was not optional

A plain dependency bump to `0.0.4` compiles cleanly and passes its tests, then quietly returns `unknown` while still reporting `source: 'google'` — indistinguishable from a user who genuinely has no age signal. Meanwhile `0.0.3` cannot be relied on indefinitely: Play can refuse a client it considers too old (`SDK_VERSION_OUTDATED`), which this library maps as terminal and therefore safe to persist. That combination would have turned a server-side refusal into a permanent loss of signal.

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
