# Changelog

## 0.1.0 — 2026-06-29

Initial release.

- iOS: `DeclaredAgeRange` (StoreKit) — returns `child`, `teen`, `adult`, or `unknown`
- Android: Google Play Age Signals (`com.google.android.play:age-signals:0.0.3`)
- `getAgeRange()` — async, returns `{ ageRange, source }`
- `isSupported()` — check platform availability before calling
