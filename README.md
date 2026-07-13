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
- `react-native-nitro-modules` peer dependency
- iOS 16.4+ deployment target (age signals require iOS 26+; older versions return `unknown`)
- Android API 23+ with Google Play Store

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
| `error` | Native API threw an error |

### `isSupported(): Promise<boolean>`

Returns `true` if the age signals API is available on the current device.

- iOS: requires iOS 26+
- Android: requires Google Play Services

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
