# API reference

Full reference for `react-native-age-signals`. For installation and a quickstart, see the [README](../README.md).

- [Results](#results) — the shape every call returns, and which values are safe to cache
- [`getAgeRange`](#getagerange) — read the user's age bracket
- [`requestAgeSignalsAccess`](#requestagesignalsaccess) — ask Android for consent
- [`isSupported`](#issupported)
- [Testing on Android](#testing-on-android) — stage fake Play responses on an emulator

---

## Results

```ts
interface AgeSignalResult {
  ageRange: 'child' | 'teen' | 'adult' | 'unknown';
  source: 'apple' | 'google' | 'unavailable' | 'declined' | 'error';
  /** Android only, and only when access was requested. */
  accessStatus?: 'shared' | 'notShared' | 'verificationRequired' | 'unavailable' | 'error';
}
```

| `ageRange` | Meaning                 |
| ---------- | ----------------------- |
| `child`    | Under 13                |
| `teen`     | 13–17                   |
| `adult`    | 18+                     |
| `unknown`  | No age signal available |

| `source`      | Meaning                                                               | Safe to cache?                                                             |
| ------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `apple`       | Apple DeclaredAgeRange answered                                       | Yes — this is the answer                                                   |
| `google`      | Google Play Age Signals answered                                      | Yes — this is the answer                                                   |
| `unavailable` | Neither this device, OS version, nor account can ever supply a signal | Yes — it is terminal                                                       |
| `declined`    | The user is not sharing their age range                               | Yes on iOS. [Not straightforward on Android](#caching-declined-on-android) |
| `error`       | No signal this time; a later attempt may succeed                      | **No** — cache it and one bad moment becomes permanent                     |

Read `source` as _what should you do about this_, not as an error code. The `unavailable` / `error` split exists precisely to answer the caching question, and it is the reason `verificationRequired` — a normal state where the user simply has not verified their age — reports `error`. Nothing failed, but the user can resolve it in the Play Store, so it is worth asking again. The precise reason is in `accessStatus`.

Buckets come from the age bounds the platform reports, using the same thresholds on both platforms: `child` when the upper bound is 12 or below, `teen` when it is 17 or below, `adult` when the upper bound is higher or the lower bound is 18 or above, `unknown` when neither bound is usable.

## `getAgeRange`

```ts
getAgeRange(options?: GetAgeRangeOptions): Promise<AgeSignalResult>

interface GetAgeRangeOptions {
  /** Android only. Request age sharing access first. May present Play's prompt. Default false. */
  requestAccess?: boolean;
}
```

Resolves rather than rejecting when the underlying API fails, so you never need a `try/catch` for that case — a failure arrives as `{ ageRange: 'unknown', source: 'unavailable' | 'error' }`.

Both platforms gate the age range behind consent, but ask for it differently. **iOS 26+** presents Apple's sharing sheet as part of the call; a dismissal arrives as `source: 'declined'`. **Android** needs consent requested explicitly, either via `requestAccess` or by calling [`requestAgeSignalsAccess()`](#requestagesignalsaccess) first:

```ts
const status = await requestAgeSignalsAccess(); // Android only, no-op elsewhere

if (status === 'shared') {
  const result = await getAgeRange(); // now able to report real bounds
}
```

Split the calls when the status drives UI; use `{ requestAccess: true }` when you only want the age range.

On iOS, a call returns `unavailable` unless the **Declared Age Range** capability is enabled — see [Install](../README.md#install).

### Where the classification comes from

On Android, from Play's own `AgeSignalsErrorCode`. Codes no user action can resolve — `API_NOT_AVAILABLE`, `PLAY_STORE_NOT_FOUND`, `APP_NOT_OWNED`, `SDK_VERSION_OUTDATED` — are `unavailable`. Everything else is `error`, including the "outdated" and "not found" codes, because a user who updates the Play Store or Play Services would then get a real signal.

On iOS, `AgeRangeService.Error.notAvailable` is `unavailable`; anything else, including cancellation, is `error`.

### Reading the reason

The result carries no error detail beyond `source`. The native side logs it:

```sh
# iOS
log stream --predicate 'subsystem == "react-native-age-signals"'
# Android
adb logcat -s AgeSignals
```

## `requestAgeSignalsAccess`

```ts
requestAgeSignalsAccess(): Promise<AgeAccessStatus>
```

**Android only.** Requests age-sharing access from Play, which `getAgeRange()` needs before it can report any bounds. Resolves `'unavailable'` on every other platform rather than throwing, so no `Platform.OS` guard is needed — Apple has no separate consent step to expose.

| Status                 | Meaning                                                                     | What to do                                         |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| `shared`               | Sharing is granted                                                          | Read the age range                                 |
| `notShared`            | The user or their parent is not sharing                                     | Carry on without a signal. Do not badger them      |
| `verificationRequired` | Age verification is legally required here and the user has not completed it | Point them at the Play Store, then ask again later |
| `unavailable`          | This device or install can never grant access                               | Stop asking                                        |
| `error`                | The request itself failed                                                   | Ask again next launch                              |

Call it on its own when the status drives UI — `verificationRequired` is the cue to explain that the user must visit the Play Store, which `getAgeRange()` alone cannot tell you. The same value also appears as `accessStatus` on a `getAgeRange()` result whenever access was requested; a plain read never asks, so it leaves the field undefined.

Requesting access needs a **foreground Activity**, since a prompt cannot be presented without one. Called from the background or before an Activity is attached, it reports `error` — retryable, because a later call from a screen will succeed.

### When Play shows a prompt

The call always performs a blocking status check. It shows Play's in-app prompt only when **all** of the following hold, which is one case out of several:

| Situation                                                                | Prompt?                             | Status                 |
| ------------------------------------------------------------------------ | ----------------------------------- | ---------------------- |
| Choice-based region, setting is "ask before sharing", not yet suppressed | **Yes**                             | `shared` / `notShared` |
| Choice-based region, "always share"                                      | No                                  | `shared`               |
| Choice-based region, "never share"                                       | No                                  | `notShared`            |
| Supervised user — the parent decides in Family Link                      | No                                  | `shared` / `notShared` |
| Mandatory-verification region, user already verified                     | No                                  | `shared`               |
| Mandatory-verification region, user not verified                         | No — resolved in the Play Store app | `verificationRequired` |
| Prompt already dismissed or declined several times                       | No — Play suppresses it             | `notShared`            |

Play throttles the prompt itself, so repeated calls cannot nag the user indefinitely.

### Caching `declined` on Android

On iOS `declined` means the user actively dismissed Apple's sheet. On Android it is broader: Play returns `NOT_SHARED` for a declined prompt, a "never share" setting, a parent's decision, _and_ a prompt it has suppressed, without distinguishing them — and the user can change that setting at any time.

So an Android `declined` can go stale in a way an iOS one cannot. This library stores nothing, so if you persist results, decide how long an Android `declined` should live rather than treating it as permanent.

## `isSupported`

```ts
isSupported(): Promise<boolean>
```

- **iOS** — `true` on 26+, `false` below. Reliable, because availability is purely a matter of OS version.
- **Android** — `true` whenever Play's client can be constructed, which is essentially any device where the class loads. **Treat this as a weak signal**: the Play SDK exposes no availability probe, so it cannot tell you whether a signal is actually obtainable.

You do not need to call it first. `getAgeRange()` performs its own check and reports `source: 'unavailable'` when the platform cannot answer, which on Android comes from Play's real error code rather than a guess.

## Testing on Android

An emulator's Play Store reports no age bounds, so `getAgeRange()` there always returns `unknown` and no other branch is reachable. Drive Play's own test double instead:

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

The consent step is staged separately, because Play only reports bounds once access is `shared`:

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

| Function                                  | Behaviour                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `setFakeResult({ ageLower?, ageUpper? })` | Answers the next reads from these bounds. Omit a bound to report it as absent, which is how Play represents an open-ended range |
| `setFakeError(errorCode)`                 | Fails the next reads with an `AgeSignalsErrorCode`. Surfaces as `unavailable` for terminal codes, `error` for transient ones    |
| `setFakeAccessStatus(status)`             | Answers the next access requests — `SHARED`, `NOT_SHARED`, `VERIFICATION_REQUIRED` or `UNSPECIFIED`                             |
| `setFakeAccessError(errorCode)`           | Fails the next access requests. Classified the same way as a failed read                                                        |
| `clearFake()`                             | Removes the fake — both halves — so calls go to the real Play client again                                                      |

A fake stays installed until you replace it or call `clearFake()`. The read pair and the access pair are independent, so you can set both up front; within each pair the setters are mutually exclusive. Because the fake replaces Play's client entirely, no prompt is ever presented while one is installed — `setFakeAccessStatus` is how you simulate what the user would have chosen.

**Android-only and debug-only.** On iOS every function throws: Apple's `DeclaredAgeRange` has no injectable test double. In a non-debuggable build every function throws too — the check is native and reads `ApplicationInfo.FLAG_DEBUGGABLE`, so a release build cannot have its age signals replaced no matter what the caller does.
