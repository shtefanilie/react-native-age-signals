# react-native-age-signals

[![CI](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml/badge.svg)](https://github.com/shtefanilie/react-native-age-signals/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-age-signals)](https://www.npmjs.com/package/react-native-age-signals)

Query the app store's knowledge of the current user's age bracket. Built on [Nitro Modules](https://nitro.margelo.com) for near-zero JSI overhead.

- **iOS** — Apple [`DeclaredAgeRange`](https://developer.apple.com/documentation/declaredagerange/) framework (iOS 26+)
- **Android** — [Google Play Age Signals](https://developer.android.com/google/play/age-signals/overview) (`com.google.android.play:age-signals`)

Based on the Texas App Store Accountability Act, which requires apps to query platform age signal APIs to determine whether a user is a child.

> **Upgrading from `0.4.x` or earlier?** See [Migrating to `0.5.0`](#migrating-to-050). Your code keeps compiling, but Android now needs `getAgeRange({ requestAccess: true })` to return an age range.

---

## Requirements

- React Native 0.75+
- `react-native-nitro-modules` peer dependency (`^0.31.10` — see `peerDependencies` in `package.json`)
- iOS 15.1+ deployment target (age signals require iOS 26+; older versions return `unknown`)
- Android API 24+ with Google Play Store

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

Both platforms gate the age range behind the user's consent, but they ask for it differently.

**iOS 26+** presents Apple's sharing sheet as part of `getAgeRange()` itself. The user may decline, which arrives as `source: 'declined'`.

**Android** needs the consent step requested explicitly, because Play's `0.0.4` SDK reports no age bounds until age sharing is granted. A plain `getAgeRange()` therefore reads as `unknown` for any user who has not already opted in:

```ts
import { getAgeRange, requestAgeSignalsAccess } from 'react-native-age-signals';

const status = await requestAgeSignalsAccess(); // Android only, no-op elsewhere

if (status === 'shared') {
  const result = await getAgeRange(); // now able to report real bounds
}
```

Or, in one call:

```ts
const result = await getAgeRange({ requestAccess: true });
// { ageRange: 'teen', source: 'google', accessStatus: 'shared' }
```

> **`requestAccess` may present a Play prompt, so it is opt-in.** Upgrading this library never adds a prompt to a call site that did not ask for one — see [When Play shows a prompt](#when-play-shows-a-prompt).

---

## API

### `getAgeRange(options?): Promise<AgeSignalResult>`

Returns the platform's best knowledge of the user's age bracket.

```ts
interface GetAgeRangeOptions {
  /** Android only. Request age sharing access first. May present Play's prompt. Default false. */
  requestAccess?: boolean;
}

interface AgeSignalResult {
  ageRange: 'child' | 'teen' | 'adult' | 'unknown';
  source: 'apple' | 'google' | 'unavailable' | 'declined' | 'error';
  /** Android only, and only when access was requested. */
  accessStatus?: 'shared' | 'notShared' | 'verificationRequired' | 'unavailable' | 'error';
}
```

| `ageRange` | Meaning                                                         |
| ---------- | --------------------------------------------------------------- |
| `child`    | Under 13                                                        |
| `teen`     | 13–17                                                           |
| `adult`    | 18+                                                             |
| `unknown`  | No age signal available (user hasn't set age, OS too old, etc.) |

| `source`      | Meaning                                                          | Worth retrying?                                                           |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apple`       | Result from Apple DeclaredAgeRange                               | —, this is the answer                                                     |
| `google`      | Result from Google Play Age Signals                              | —, this is the answer                                                     |
| `unavailable` | Neither this device, OS version, nor account can supply a signal | No                                                                        |
| `declined`    | User is not sharing their age range                              | No on iOS — asking again is hostile. **On Android, see the caveat below** |
| `error`       | No signal this time, but a later attempt may succeed             | Yes                                                                       |

Read `source` as _what should you do about this_, not as an error code. That is why `verificationRequired` — a perfectly normal state where the user simply has not verified their age yet — reports `error`: nothing failed, but the user can resolve it in the Play Store, so the answer is worth asking for again. The precise reason is in `accessStatus`.

`getAgeRange()` resolves rather than rejecting when the underlying API fails, so you never need to wrap it in a `try/catch` for that case — a failure arrives as `{ ageRange: 'unknown', source: 'unavailable' }` or `{ ageRange: 'unknown', source: 'error' }`.

**The difference between those two is the point.** Callers typically cache this result, and the split tells you whether caching is safe:

- `unavailable` is terminal. Nothing the user or the app does will change it within this install, so cache it and stop asking.
- `error` is transient — a network failure, a Play service that could not be bound, an API that was not ready. Do **not** cache it, or one bad moment becomes permanent. Ask again next launch.

On Android the split comes from Play's own `AgeSignalsErrorCode`. Codes no user action can resolve (`API_NOT_AVAILABLE`, `PLAY_STORE_NOT_FOUND`, `APP_NOT_OWNED`, `SDK_VERSION_OUTDATED`) are `unavailable`. Everything else is `error`, including the "outdated" and "not found" codes, because a user who updates the Play Store or Play Services would then get a real signal.

On iOS `AgeRangeService.Error.notAvailable` is `unavailable`; anything else, including cancellation, is `error`.

The result carries no error detail beyond `source`. When you need the underlying reason, read the native log: iOS logs to the unified log under subsystem `react-native-age-signals`, Android to logcat under tag `AgeSignals`.

```sh
# iOS
log stream --predicate 'subsystem == "react-native-age-signals"'
# Android
adb logcat -s AgeSignals
```

The buckets are derived from the age bounds the platform reports, using the same thresholds on iOS and Android. A user is `child` when their upper bound is 12 or below, `teen` when it is 17 or below, and `adult` when the upper bound is higher or the lower bound is 18 or above. When neither bound is usable the result is `unknown`.

### `requestAgeSignalsAccess(): Promise<AgeAccessStatus>`

**Android only.** Requests age sharing access from Play, which `getAgeRange()` needs before it can report any bounds. Resolves `'unavailable'` on every other platform rather than throwing, so you do not need a `Platform.OS` guard — Apple has no separate consent step to expose.

| `accessStatus`         | Meaning                                                                     | What to do                                         |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| `shared`               | Sharing is granted                                                          | Read the age range                                 |
| `notShared`            | The user or their parent is not sharing                                     | Carry on without a signal. Do not badger them      |
| `verificationRequired` | Age verification is legally required here and the user has not completed it | Point them at the Play Store, then ask again later |
| `unavailable`          | This device or install can never grant access                               | Stop asking                                        |
| `error`                | The request itself failed                                                   | Ask again next launch                              |

Call it on its own when you need the status to drive UI — `verificationRequired` is the cue to explain that the user must visit the Play Store, which `getAgeRange()` alone cannot tell you. Use `getAgeRange({ requestAccess: true })` when you only want the age range and do not care why it is missing.

`accessStatus` also appears on the `getAgeRange()` result whenever access was requested. A plain read never asks, so it leaves the field undefined.

#### When Play shows a prompt

`requestAgeSignalsAccess()` always performs a blocking status check. It shows Play's in-app prompt only when **all** of the following hold, which is one case out of several:

| Situation                                                                | Prompt?                             | Status                 |
| ------------------------------------------------------------------------ | ----------------------------------- | ---------------------- |
| Choice-based region, setting is "ask before sharing", not yet suppressed | **Yes**                             | `shared` / `notShared` |
| Choice-based region, "always share"                                      | No                                  | `shared`               |
| Choice-based region, "never share"                                       | No                                  | `notShared`            |
| Supervised user — the parent decides in Family Link                      | No                                  | `shared` / `notShared` |
| Region with mandatory age verification, user already verified            | No                                  | `shared`               |
| Region with mandatory age verification, user not verified                | No — resolved in the Play Store app | `verificationRequired` |
| Prompt already dismissed or declined several times                       | No — Play suppresses it             | `notShared`            |

Play throttles the prompt itself, so repeated calls cannot nag the user indefinitely.

Requesting access needs a **foreground Activity**, since there is no way to present a prompt without one. Called from the background or before an Activity is attached, it reports `accessStatus: 'error'` — retryable, because a later call from a screen will succeed.

#### Caching `declined` on Android

On iOS `declined` means the user actively dismissed Apple's sheet. On Android it is broader: Play returns `NOT_SHARED` for a declined prompt, a "never share" setting, a parent's decision, _and_ a prompt it has suppressed, without distinguishing them. A user can change that setting at any time.

So an Android `declined` can go stale in a way an iOS one cannot. This library stores nothing — every call queries the platform fresh — so if you persist results, decide how long an Android `declined` should live rather than treating it as permanent.

### `isSupported(): Promise<boolean>`

Returns `true` if the age signals API is available on the current device.

- iOS: `true` on iOS 26+, `false` below it. Reliable, because availability is purely a matter of OS version.
- Android: `true` whenever Play's client can be constructed, which is essentially any device where the class loads. **Treat this as a weak signal.** The Play SDK exposes no availability probe, so this cannot tell you whether a signal is actually obtainable.

You do not need to call it before `getAgeRange()`. `getAgeRange()` performs its own check and reports `source: 'unavailable'` when the platform cannot answer, which on Android is derived from Play's real error code rather than guessed up front.

---

## Testing (Android only)

An emulator's Play Store reports no age bounds, so `getAgeRange()` there always returns `unknown` and you cannot reach any other branch. To exercise real values, drive Play's own test double through the `testing` entry point:

```ts
import {
  AgeSignalsErrorCode,
  AgeSignalsStatus,
  clearFake,
  setFakeAccessError,
  setFakeAccessStatus,
  setFakeError,
  setFakeResult,
} from 'react-native-age-signals/testing';

setFakeResult({ ageLower: 13, ageUpper: 17 });
await getAgeRange(); // { ageRange: 'teen', source: 'google' }

setFakeError(AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND);
await getAgeRange(); // { ageRange: 'unknown', source: 'unavailable' } — terminal code

setFakeError(AgeSignalsErrorCode.NETWORK_ERROR);
await getAgeRange(); // { ageRange: 'unknown', source: 'error' } — transient code

clearFake(); // back to the real Play client
```

The consent step is staged separately, because Play only reports bounds once access is `shared` — so testing the opt-in path needs both halves:

```ts
setFakeAccessStatus(AgeSignalsStatus.SHARED);
setFakeResult({ ageLower: 0, ageUpper: 12 });
await getAgeRange({ requestAccess: true });
// { ageRange: 'child', source: 'google', accessStatus: 'shared' }

setFakeAccessStatus(AgeSignalsStatus.NOT_SHARED);
await getAgeRange({ requestAccess: true });
// { ageRange: 'unknown', source: 'declined', accessStatus: 'notShared' }
// the staged result is never read — a non-shared status short-circuits

setFakeAccessStatus(AgeSignalsStatus.VERIFICATION_REQUIRED);
await requestAgeSignalsAccess(); // 'verificationRequired'

setFakeAccessError(AgeSignalsErrorCode.NETWORK_ERROR);
await requestAgeSignalsAccess(); // 'error' — transient
```

| Function                                  | Behaviour                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setFakeResult({ ageLower?, ageUpper? })` | Answers the next reads from these bounds. Omit a bound to report it as absent, which is how Play represents an open-ended range.                     |
| `setFakeError(errorCode)`                 | Fails the next reads with an `AgeSignalsErrorCode`. Surfaces as `source: 'unavailable'` for terminal codes and `source: 'error'` for transient ones. |
| `setFakeAccessStatus(status)`             | Answers the next access requests with an `AgeSignalsStatus` — `SHARED`, `NOT_SHARED`, `VERIFICATION_REQUIRED` or `UNSPECIFIED`.                      |
| `setFakeAccessError(errorCode)`           | Fails the next access requests. Classified the same way as a failed read.                                                                            |
| `clearFake()`                             | Removes the fake — both halves — so calls go to the real Play client again.                                                                          |

A fake stays installed until you replace it or call `clearFake()`. The read pair and the access pair are independent: staging one does not disturb the other, so you can set both up front. Within each pair the setters are mutually exclusive — staging a result clears a staged error and vice versa.

Because the fake replaces Play's client entirely, no prompt is ever presented while one is installed. `setFakeAccessStatus` is how you simulate what the user would have chosen.

**This is Android-only and debug-only.**

- On iOS every function throws. Apple's `DeclaredAgeRange` has no injectable test double, so there is nothing to stand in for it. Guard with `Platform.OS === 'android'` if you share test code.
- In a non-debuggable build every function throws. The check is native and reads `ApplicationInfo.FLAG_DEBUGGABLE`, so a release build cannot have its age signals replaced no matter what the caller does. You do not need to strip these calls for safety, though keeping them out of production code is still the tidier choice.

---

## Migrating to `0.5.0`

`0.5.0` moves Android onto Play Age Signals `0.0.4`, which requires an explicit consent step before it will report an age range.

**Nothing you have written stops compiling, and nothing starts prompting on its own.** But on Android you now have to opt in to get a signal for users who have not already enabled age sharing.

### The short version

- **Re-run `pod install` (iOS) and sync gradle (Android).** The generated Nitro glue changed.
- **Nothing to change to keep building.** `getAgeRange()` still takes no arguments, and `AgeSignalSource` is unchanged — no new union member, so exhaustive `switch` statements and `Record<AgeSignalSource, T>` maps still typecheck.
- **On Android, add `{ requestAccess: true }` if you want the age range.** Without it, any user who has not already opted into age sharing reads as `{ ageRange: 'unknown', source: 'google' }`. This is the one change that actually matters.
- **iOS is unaffected.** Apple's sheet is still part of `getAgeRange()`; `requestAccess` is ignored there.
- **`requestAccess` can present a Play prompt.** That is exactly why it is opt-in — see [When Play shows a prompt](#when-play-shows-a-prompt). It fires for one user situation out of several, and Play throttles it.
- **Call it where an Activity is in the foreground.** Consent cannot be requested from the background; it reports `source: 'error'` if none is available.
- **If you cache results, re-read the two notes below.** `declined` now has a broader meaning on Android, and a new state maps onto `error`.
- **Android's documented minimum is now API 24**, correcting the README — the Gradle config always required 24.

### `getAgeRange()` before and after

```ts
// 0.4.x — one call, and on Android it was a silent read
const result = await getAgeRange();

// 0.5.0 — still valid, still silent, but Android needs consent to return bounds
const result = await getAgeRange();

// 0.5.0 — opt in so Android can actually answer
const result = await getAgeRange({ requestAccess: true });
// { ageRange: 'teen', source: 'google', accessStatus: 'shared' }
```

If you would rather keep consent and reading separate — worth doing when the status drives UI:

```ts
const status = await requestAgeSignalsAccess(); // Android only; 'unavailable' elsewhere

if (status === 'verificationRequired') {
  // tell the user to verify their age in the Play Store, then ask again later
} else if (status === 'shared') {
  const result = await getAgeRange();
}
```

### Two things to check if you persist results

**1. `declined` is broader on Android.** It used to appear only on iOS, where it means the user dismissed Apple's sheet. It now also covers Android's `NOT_SHARED` — which conflates a declined prompt, a "never share" setting, a parent's decision in Family Link, and a prompt Play has suppressed. The user can change that setting at any time, so an Android `declined` can go stale where an iOS one cannot. Decide how long to honour it rather than treating it as permanent.

**2. A new state reports `source: 'error'`.** When age verification is legally required and the user has not completed it, you get `source: 'error'` with `accessStatus: 'verificationRequired'`. Nothing failed — but the user can resolve it in the Play Store, so it must stay retryable. If your caching logic keys off `source`, this already behaves correctly: `error` is the value you should not be caching. If you log every `error` as a failure, expect some benign noise, and switch on `accessStatus` to tell the two apart.

### Why the SDK bump was not optional

A plain dependency bump to `0.0.4` compiles cleanly and passes its tests, then quietly returns `unknown` while still reporting `source: 'google'` — indistinguishable from a user who genuinely has no age signal. Meanwhile `0.0.3` cannot be relied on indefinitely: Play can refuse a client it considers too old (`SDK_VERSION_OUTDATED`), and this library maps that code as terminal, which the caching guidance above says is safe to persist. That combination would have turned a server-side refusal into a permanent loss of signal.

---

## Platform support

| Platform | Min version | Notes                                                                                                                                                        |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| iOS      | 26.0        | `DeclaredAgeRange` framework (presents system age-sharing prompt)                                                                                            |
| Android  | API 24      | Requires Google Play Store. Age sharing needs an explicit consent request — see [`requestAgeSignalsAccess`](#requestagesignalsaccess-promiseageaccessstatus) |

`unknown` is a common and expected return value — users may decline, not have set their age, be on an unsupported OS version, or on Android simply not have granted age sharing.

---

## Background

The [Texas App Store Accountability Act](https://capitol.texas.gov/) requires apps to query platform age signal APIs. Apple and Google both provide native APIs for this purpose. This library wraps both in a single cross-platform React Native module.

---

## License

MIT
