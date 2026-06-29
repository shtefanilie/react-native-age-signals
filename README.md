# react-native-age-signals

[![CI](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml/badge.svg)](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-age-signals)](https://www.npmjs.com/package/react-native-age-signals)
[![AI Slop Inside](https://sladge.net/badge.svg)](https://sladge.net)

Query the app store's knowledge of the current user's age bracket.

- **iOS** — Apple [`DeclaredAgeRange`](https://developer.apple.com/documentation/declaredagerange/) (StoreKit, iOS 17.4+)
- **Android** — [Google Play Age Signals](https://developer.android.com/google/play/age-signals/overview) (`com.google.android.play:age-signals`)

 Based on the Texas App Store Accountability Act, which requires apps to query platform age signal APIs to determine whether a user is a child.

---

## Installation

```sh
npm install react-native-age-signals
```

### iOS

No extra setup required. The `DeclaredAgeRange` API is part of StoreKit — no entitlements needed.

Minimum iOS version: **16.4** (age signals only returned on **17.4+**, older devices return `unknown`).

### Android

No extra setup required. The Play Age Signals library and manifest entries are resolved automatically via Gradle.

Minimum Android API level: **23**.

---

## Usage

```ts
import { getAgeRange, isSupported } from 'react-native-age-signals';

const supported = await isSupported();

const result = await getAgeRange();
// { ageRange: 'child' | 'teen' | 'adult' | 'unknown', source: 'apple' | 'google' | 'unavailable' }
```

---

## API

### `getAgeRange(): Promise<AgeSignalResult>`

Returns the platform's best knowledge of the user's age bracket.

```ts
interface AgeSignalResult {
  ageRange: 'child' | 'teen' | 'adult' | 'unknown';
  source: 'apple' | 'google' | 'unavailable';
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

### `isSupported(): Promise<boolean>`

Returns `true` if the age signals API is available on the current device.

- iOS: requires iOS 17.4+
- Android: requires Google Play Services

---

## Platform support

| Platform | Min version | Notes |
|----------|-------------|-------|
| iOS | 17.4 | `DeclaredAgeRange` added in iOS 17.4 |
| Android | API 23 | Requires Google Play Store |

`unknown` is a common and expected return value — users may not have set their age in the App Store or Play Store.

---

## Background

The [Texas App Store Accountability Act](https://capitol.texas.gov/) requires apps to query platform age signal APIs. Apple and Google both provide native APIs for this purpose. This library wraps both in a single cross-platform React Native module.

---

## License

MIT
