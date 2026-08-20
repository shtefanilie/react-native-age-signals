# react-native-age-signals

[![CI](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml/badge.svg)](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-age-signals)](https://www.npmjs.com/package/react-native-age-signals)

Query the app store's knowledge of the current user's age bracket. Built on [Nitro Modules](https://nitro.margelo.com) for near-zero JSI overhead.

- **iOS** — Apple [`DeclaredAgeRange`](https://developer.apple.com/documentation/declaredagerange/) framework (iOS 26+)
- **Android** — [Google Play Age Signals](https://developer.android.com/google/play/age-signals/overview) (`com.google.android.play:age-signals`)

Based on the Texas App Store Accountability Act, which requires apps to query platform age signal APIs to determine whether a user is a child.

---

## Requirements

- React Native 0.75+
- `react-native-nitro-modules` peer dependency (see nitro-runtime compatibility below)
- iOS 15.1+ deployment target (age signals require iOS 26+; older versions return `unknown`)
- Android API 23+ with Google Play Store

### Nitro-runtime compatibility

The Nitro glue is version-coupled with the host app's `react-native-nitro-modules` runtime — the generated code must be built against the same nitro line the host installs. This release ships glue generated with `nitrogen` **0.31.10** (nitro line **0.31.x**).

| `react-native-age-signals` | Generated against nitro line |
| --- | --- |
| `0.4.0` | `0.31.x` (`nitrogen`/`react-native-nitro-modules` `0.31.10`) |
| `0.3.0`–`0.3.1` | `0.31.x` (`nitrogen`/`react-native-nitro-modules` `0.31.10`) |
| `0.1.0`–`0.2.1` | `0.36.x` |

If your app is on a different nitro line, pin this library's `nitrogen` and `react-native-nitro-modules` devDependencies to your line and run `npm run codegen` to regenerate the glue before building.

> **The `autolinking` block in `nitro.json` is schema-versioned too.** Nitro `0.31.x` expects flat
> language keys (`{ "AgeSignals": { "swift": "HybridAgeSignals", "kotlin": "HybridAgeSignals" } }`),
> whereas `0.36.x` expects nested per-platform objects (`{ "ios": { "language": "swift", ... } }`).
> Zod ignores the unknown keys instead of erroring, so feeding the wrong shape to nitrogen silently
> emits glue that registers **no** HybridObjects — the build succeeds and the app throws
> "has not yet been registered in the HybridObjectRegistry" at runtime. After changing nitro lines,
> always confirm `nitrogen/generated/ios/*Autolinking.mm` exists and that
> `nitrogen/generated/android/*OnLoad.cpp` contains `registerHybridObjectConstructor` calls.

---

## Installation

```sh
npm install react-native-age-signals react-native-nitro-modules
```

### iOS

```sh
cd ios && pod install
```

No entitlements needed. The `DeclaredAgeRange` framework is weak-linked automatically.

### Android

No extra setup required. Play Age Signals and manifest entries resolved via Gradle.

---

## Usage

```ts
import { getAgeRange, isSupported } from 'react-native-age-signals';

const supported = await isSupported();

const result = await getAgeRange();
// { ageRange: 'child' | 'teen' | 'adult' | 'unknown', source: 'apple' | 'google' | 'unavailable' | 'declined' | 'error' }
```

> **Note:** On iOS 26+, `getAgeRange()` presents a system prompt asking the user to share their age bracket. The user may decline.
>
> On Android it presents nothing — the Play Store answers from what it already knows, so the call is silent. The two platforms are deliberately not symmetrical here: Apple exposes age sharing only through a prompt, and Play exposes it only as a read.

---

## API

### `getAgeRange(): Promise<AgeSignalResult>`

Returns the platform's best knowledge of the user's age bracket.

```ts
interface AgeSignalResult {
  ageRange: 'child' | 'teen' | 'adult' | 'unknown';
  source: 'apple' | 'google' | 'unavailable' | 'declined' | 'error';
}
```

| `ageRange` | Meaning |
|------------|---------|
| `child` | Under 13 |
| `teen` | 13–17 |
| `adult` | 18+ |
| `unknown` | No age signal available (user hasn't set age, OS too old, etc.) |

| `source` | Meaning |
|----------|---------|
| `apple` | Result from Apple DeclaredAgeRange |
| `google` | Result from Google Play Age Signals |
| `unavailable` | API not available on this device/OS |
| `declined` | User declined to share age range (iOS) |
| `error` | Native API reported an error |

`getAgeRange()` resolves rather than rejecting when the underlying API fails: you get `{ ageRange: 'unknown', source: 'error' }` on both platforms.

The buckets are derived from the age bounds the platform reports, using the same thresholds on iOS and Android. A user is `child` when their upper bound is 12 or below, `teen` when it is 17 or below, and `adult` when the upper bound is higher or the lower bound is 18 or above. When neither bound is usable the result is `unknown`.

### `isSupported(): Promise<boolean>`

Returns `true` if the age signals API is available on the current device.

- iOS: requires iOS 26+
- Android: requires Google Play Services

---

## Testing (Android only)

An emulator's Play Store reports no age bounds, so `getAgeRange()` there always returns `unknown` and you cannot reach any other branch. To exercise real values, drive Play's own test double through the `testing` entry point:

```ts
import {
  AgeSignalsErrorCode,
  clearFake,
  setFakeError,
  setFakeResult,
} from 'react-native-age-signals/testing';

setFakeResult({ ageLower: 13, ageUpper: 17 });
await getAgeRange(); // { ageRange: 'teen', source: 'google' }

setFakeError(AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND);
await getAgeRange(); // { ageRange: 'unknown', source: 'error' }

clearFake();         // back to the real Play client
```

| Function | Behaviour |
|----------|-----------|
| `setFakeResult({ ageLower?, ageUpper? })` | Answers the next reads from these bounds. Omit a bound to report it as absent, which is how Play represents an open-ended range. |
| `setFakeError(errorCode)` | Fails the next reads with an `AgeSignalsErrorCode`, surfacing as `source: 'error'`. |
| `clearFake()` | Removes the fake so reads go to the real Play client again. |

A fake stays installed until you replace it or call `clearFake()`.

**This is Android-only and debug-only.**

- On iOS every function throws. Apple's `DeclaredAgeRange` has no injectable test double, so there is nothing to stand in for it. Guard with `Platform.OS === 'android'` if you share test code.
- In a non-debuggable build every function throws. The check is native and reads `ApplicationInfo.FLAG_DEBUGGABLE`, so a release build cannot have its age signals replaced no matter what the caller does. You do not need to strip these calls for safety, though keeping them out of production code is still the tidier choice.

---

## Platform support

| Platform | Min version | Notes |
|----------|-------------|-------|
| iOS | 26.0 | `DeclaredAgeRange` framework (presents system age-sharing prompt) |
| Android | API 23 | Requires Google Play Store |

`unknown` is a common and expected return value — users may decline, not have set their age, or be on an unsupported OS version.

---

## Background

The [Texas App Store Accountability Act](https://capitol.texas.gov/) requires apps to query platform age signal APIs. Apple and Google both provide native APIs for this purpose. This library wraps both in a single cross-platform React Native module.

---

## License

MIT
