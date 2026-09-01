package com.margelo.nitro.agesignals

import com.google.android.play.agesignals.model.AgeSignalsErrorCode

/** Logcat tag for everything this module reports. Read it with `adb logcat -s AgeSignals`. */
internal const val LOG_TAG = "AgeSignals"

/**
 * Whether a Play error code means "this install can never supply a signal", as
 * opposed to "this attempt failed".
 *
 * The distinction matters because a consumer typically caches the outcome, and
 * caching a transient failure makes it permanent. This library stores nothing
 * itself, so the value it reports is the only influence it has over that.
 *
 * Only codes no user action can resolve are terminal. The "outdated" and "not
 * found" codes are deliberately transient: a user who updates the Play Store or
 * Play Services would then get a real signal, and reporting a terminal failure
 * would hide that from them until they reinstalled.
 *
 * The same rule is applied to Apple's error cases in ios/HybridAgeSignals.swift.
 * Change both together.
 */
internal fun isTerminalPlayError(errorCode: Int): Boolean {
  return when (errorCode) {
    AgeSignalsErrorCode.API_NOT_AVAILABLE,
    AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND,
    AgeSignalsErrorCode.APP_NOT_OWNED,
    AgeSignalsErrorCode.SDK_VERSION_OUTDATED -> true
    else -> false
  }
}
