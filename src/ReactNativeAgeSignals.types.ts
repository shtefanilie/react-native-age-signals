export type AgeRange = 'child' | 'teen' | 'adult' | 'unknown';
export type AgeSignalSource = 'apple' | 'google' | 'unavailable' | 'declined' | 'error';

/**
 * What the platform said about age *sharing*, as opposed to what the age is.
 *
 * A separate vocabulary from {@link AgeSignalSource} on purpose: `source` answers
 * "where did this answer come from, and is it worth retrying", while this answers
 * "is the user sharing their age range at all".
 *
 * - `shared` — sharing is granted. This is the only status a real age range can follow.
 * - `notShared` — the user or their parent is not sharing. On Android this covers a
 *   declined prompt, a "never share" setting and a prompt Play has suppressed, which
 *   Play does not distinguish, so it can go stale if the user later changes their mind.
 * - `verificationRequired` — the user is in a jurisdiction where age verification is
 *   mandatory and has not completed it. Resolvable by the user in the Play Store, so
 *   worth asking again later.
 * - `unavailable` — this device or install can never grant access.
 * - `error` — the request itself failed, or the platform has no consent step to ask
 *   (iOS, where the sheet is part of the read). Worth retrying.
 */
export type AgeAccessStatus =
  'shared' | 'notShared' | 'verificationRequired' | 'unavailable' | 'error';

export interface AgeSignalResult {
  ageRange: AgeRange;
  source: AgeSignalSource;
  /**
   * The age-sharing status this result came from. Android only, and only set when
   * access was requested — a plain read never asks, so it leaves this undefined.
   */
  accessStatus?: AgeAccessStatus;
}

export interface GetAgeRangeOptions {
  /**
   * Request age-sharing access before reading. Android only.
   *
   * Play's age-signals 0.0.4 SDK reports no age bounds until sharing is granted, so
   * without this a user who has not already opted in always reads as `unknown`.
   *
   * Enabling it may present Play's in-app prompt — but only for an unsupervised user,
   * in a region where sharing is a choice rather than a legal requirement, whose Play
   * setting is "ask before sharing", and only until Play suppresses the prompt after
   * repeated dismissals. Every other case resolves without showing anything.
   *
   * Defaults to false, so upgrading this library cannot introduce a prompt into a call
   * site that never had one. Ignored on iOS, where Apple's sheet is part of the read.
   */
  requestAccess?: boolean;
}
