# Changelog

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
