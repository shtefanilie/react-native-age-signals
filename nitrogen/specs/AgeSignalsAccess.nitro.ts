import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Android-only age-sharing consent surface, exposed to JavaScript as
 * `requestAgeSignalsAccess()`.
 *
 * Play's 0.0.4 SDK splits age signals into two calls: this one establishes
 * whether the user shares their age range, and `getAgeRange` reads it. Without
 * a `SHARED` status, Play reports no age bounds at all.
 *
 * Declared without an `ios` platform so nitrogen emits no Swift or iOS C++ for
 * it. Apple has no separate consent step — `AgeRangeService.requestAgeRange`
 * presents its sheet and returns the range in one call — so there is nothing
 * meaningful to implement there. The JavaScript wrapper resolves `unavailable`
 * on other platforms rather than reaching native at all.
 */
export interface AgeSignalsAccess extends HybridObject<{ android: 'kotlin' }> {
  requestAgeSignalsAccess(): Promise<string>;
}
