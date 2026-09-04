# Changelog

## 0.5.0 — 2026-09-01

Moves to Play Age Signals `0.0.4`, which requires a consent step before it will report an age range. Existing code keeps working unchanged; opting into the consent step is one flag.

### Why this release exists

Google's `0.0.4` release notes make the two-call flow mandatory: `requestAgeSignalsAccess()` establishes whether the user shares their age range, and `checkAgeSignals()` reads it. Without the first call, the second reports no bounds at all for anyone who has not already opted in.

Nothing about that is a compile error, which is what makes it worth a release note. A bare dependency bump builds clean and passes its tests, then quietly returns `{ ageRange: 'unknown', source: 'google' }` — a confident-looking answer that actually means consent was never requested. Verified against the shipped bytecode rather than inferred: `AgeSignalsResult` parses each field through a helper that returns null for an absent bundle key instead of throwing.

Staying on `0.0.3` was the worse option. `AgeSignalsErrorCode.SDK_VERSION_OUTDATED` exists, so Play can refuse a client it considers too old, and this library maps that code as terminal — which the README tells you is safe to cache. A server-side refusal would therefore have become a permanent loss of signal for affected installs.

### Added

- **`requestAgeSignalsAccess(): Promise<AgeAccessStatus>`** — requests age sharing access from Play. **Android only**, resolving `'unavailable'` elsewhere rather than throwing, so no `Platform.OS` guard is needed. Returns `shared`, `notShared`, `verificationRequired`, `unavailable` or `error`. Worth calling on its own when the status drives UI: `verificationRequired` means the user must visit the Play Store, which a read alone cannot tell you.
- **`getAgeRange({ requestAccess: true })`** — requests access, then reads, in one call. A non-`shared` outcome short-circuits the read and reports the access status instead of an unexplained `unknown`.
- **`accessStatus` on `AgeSignalResult`** — optional, Android only, set only when access was requested. A plain read never asks, so it stays undefined.
- `AgeAccessStatus` and `GetAgeRangeOptions` are exported.
- `react-native-age-signals/testing` gains `setFakeAccessStatus(status)`, `setFakeAccessError(code)` and the `AgeSignalsStatus` constants, so the consent half is drivable from an emulator. Staged independently of the read fakes — Play needs both to reach a bounds-bearing result — and mutually exclusive within each pair.

### Changed

- `com.google.android.play:age-signals` `0.0.3` → `0.0.4`. Play's consent activity and its theme merge in from the AAR automatically; no manifest work, and no AppCompat dependency.
- **`getAgeRange()` with no arguments behaves exactly as before.** The consent step is opt-in precisely because it can present a system prompt, and upgrading a library should not introduce one into a call site that never asked for it. The cost is that an Android user who has not already opted into sharing now reads as `unknown` until you pass the flag — if you want the signal, pass it.
- `source: 'declined'` now also covers Android's `NOT_SHARED`. It previously appeared only on iOS. **Revisit this if you cache results:** Play does not distinguish a declined prompt from a "never share" setting from a suppressed prompt, and the user can change that setting at any time, so an Android `declined` can go stale in a way an iOS one cannot.
- `verificationRequired` reports `source: 'error'`. Nothing failed — the user simply has not verified their age yet — but the state is resolvable in the Play Store, so it has to stay retryable. `source` records whether retrying is worthwhile; the precise reason is in `accessStatus`. Reporting it as `unavailable` would let a caller cache away a state the user can fix.
- `AgeSignalSource` is **unchanged**. Adding a member would break consumers treating the union as closed — an exhaustive `switch`, or a `Record<AgeSignalSource, T>` — so the new detail arrives as the optional `accessStatus` instead, which widens the result type rather than breaking it.
- The terminal-versus-retryable rule for Play error codes is now shared between the read and the consent request, so the two cannot classify the same code differently.
- README corrected: the Android minimum is API 24, matching `android/build.gradle`, not API 23.

### Notes

- Requesting access needs a foreground Activity. Called from the background, it reports `error` — retryable, since a later call from a screen will succeed.
- Play throttles its own prompt: after a few dismissals it stops showing it and returns `notShared`. Repeated calls cannot nag a user.
- `significantChangeStatus`, `significantChangeApprovalDate`, `installId` and `ageRangeSource` are exposed by `0.0.4` but deliberately not surfaced here.
- Glue is still generated with `nitrogen` **0.31.10**, unchanged. Consumers must re-run `pod install` (iOS) / sync gradle (Android) after upgrading, as the generated glue changed.

## 0.4.0 — 2026-08-17

The Android side of this library had never compiled, so nothing it did on Android had ever run. This release makes it work, and adds a way to test it.

### Fixed

- **Android never built.** Six defects, each hiding the next: the nitro dependency was declared as a maven coordinate that is not published anywhere; `appContext.reactContext` is not part of the nitro API; fbjni and react-android were never declared, so the generated spec's `HybridData` and `DoNotStrip` references went unresolved; `buildFeatures.prefab` was off, so the generated `find_package` calls could not resolve; the generated glue came from `nitrogen` 0.31.10 while the runtime resolved to 0.36.1, whose `HybridObject` no longer has `updateNative`; and nitro 0.36 headers require C++20 rather than C++17.
- **Android HybridObjects were never registered.** Nothing called `System.loadLibrary`, because the library shipped no `ReactPackage` and declared no `packageImportPath`, so `createHybridObject('AgeSignals')` produced `undefined` and every call failed with `Cannot read property 'isSupported' of undefined`. iOS was unaffected — there the generated autolinking file registers during static initialisation.
- **Android results silently degraded to `unknown`.** The bucket was derived from `AgeSignalsResult.userStatus()`, and against a Play Store that no longer populates it every result fell through to `unknown` with no error. Buckets now come from `ageLower()`/`ageUpper()` instead. Comparing the `age-signals` 0.0.3 and 0.0.4 AARs confirms those two accessors are unchanged while `userStatus()` was removed outright in 0.0.4 (alongside a new `ageRangeSource()`), so the bounds are the portable choice — this library still pins 0.0.3. The corresponding IPC bundle keys (`age.range.lower`/`age.range.upper`, versus `user.status` giving way to `age.range.source`) are inferred from that same class comparison, not from Google's changelog.
- **The platforms disagreed on age boundaries.** Android used under-13/13–17/18+ while iOS used under-14/14–18/19+, so a 13-year-old was `child` on iOS and `teen` on Android. Both now use child under 13, teen 13–17, adult 18+, matching the `ageGates: 13, 18` passed to Apple.
- **`source: 'error'` was unreachable on Android.** `getAgeRange()` rejected there while iOS resolved with `source: 'error'`. Both now resolve, so the declared `AgeSignalSource` union is finally honest.
- **The native library was not 16 KB page size compatible.** `libReactNativeAgeSignals.so` had 4 KB aligned LOAD segments, pulling every consuming app into page size compatibility mode on Android 15+. Now built with flexible page sizes.
- iOS: replaced `UIApplication.shared.keyWindow`, deprecated since iOS 13 and unaware of multi-scene apps, with a `connectedScenes` lookup.

### Added

- `react-native-age-signals/testing` — Android-only helpers backed by Play's `FakeAgeSignalsManager`: `setFakeResult({ ageLower, ageUpper })`, `setFakeError(code)`, `clearFake()`, plus the `AgeSignalsErrorCode` constants. Refuses to run in a non-debuggable build, checked natively, so a release build cannot have its age signals replaced. Throws on iOS, which has no injectable test double. See the README.
- A package `exports` map, so the `testing` subpath resolves. `main` and `types` are retained for older resolvers.

### Changed

- **`source` now distinguishes terminal failures from retryable ones.** Both platforms previously collapsed every failure into `source: 'error'` and discarded the reason, so "this device can never supply a signal" and "this attempt happened to fail" were indistinguishable. That matters because callers cache the result: caching a transient failure makes it permanent, while retrying a permanent one repeats a doomed call on every launch. `unavailable` now means stop asking; `error` means ask again next launch. Android maps Play's `AgeSignalsErrorCode` (terminal: `API_NOT_AVAILABLE`, `PLAY_STORE_NOT_FOUND`, `APP_NOT_OWNED`, `SDK_VERSION_OUTDATED`; everything else retryable, including the "outdated" codes a user can fix by updating Play). iOS maps `AgeRangeService.Error`, where `.notAvailable` is terminal and everything else, including cancellation, is retryable. **If you cache results, revisit that logic** — `setFakeError` now exercises both paths.
- **The native object is created on first use rather than at import.** `createHybridObject` at module scope threw while the importing module was still evaluating, so a registration failure took the host app down at boot instead of reaching the caller. It now surfaces as an ordinary failure, and logs a warning once naming the likely cause. No API change.
- Both platforms now log the underlying failure reason, which `source` alone cannot express: iOS to the unified log under subsystem `react-native-age-signals`, Android to logcat under tag `AgeSignals`.
- `compileSdk` raised from 34 to 36.
- `peerDependencies` now requires `react-native-nitro-modules` `^0.31.10` instead of `*`. The generated glue is coupled to one nitro line, so `*` let a host on 0.36.x install cleanly and then fail to build. npm now reports the mismatch at install time.

### Nitro line

This release ships glue generated with `nitrogen` **0.31.10** (nitro line **0.31.x**), unchanged from `0.3.0`–`0.3.1`. `nitro.json` uses the flat autolinking shape that line expects (`{ "AgeSignals": { "swift": …, "kotlin": … } }`); the nested per-platform shape belongs to `0.36.x`, and feeding the wrong one to nitrogen silently emits glue that registers nothing. See the compatibility table in the README.

Consumers must re-run `pod install` (iOS) / sync gradle (Android) after upgrading.

### Internal

- The example app pinned nitro `^0.36.1` while the glue targets `0.31.x`, so it could not build the library at all. Pinned to `0.31.10` and resynced its `Podfile.lock`.

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
