package com.margelo.nitro.agesignals

import android.app.Activity
import android.util.Log
import com.google.android.play.agesignals.AgeSignalsAccessRequest
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsManager
import com.google.android.play.agesignals.model.AgeSignalsStatus
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * The `accessStatus` values this module reports to JavaScript.
 *
 * Deliberately a separate vocabulary from `source`: `source` answers "where did
 * this answer come from, and is it worth retrying", while these answer "what did
 * Play say about age sharing". A caller needs both to act sensibly.
 */
internal object AccessStatus {
  const val SHARED = "shared"
  const val NOT_SHARED = "notShared"
  const val VERIFICATION_REQUIRED = "verificationRequired"
  const val UNAVAILABLE = "unavailable"
  const val ERROR = "error"
}

/**
 * Requests age-sharing access from Play, which the 0.0.4 SDK requires before
 * `checkAgeSignals` will report any age bounds.
 *
 * Shared by [HybridAgeSignalsAccess], which exposes it to JavaScript directly,
 * and by `HybridAgeSignals.getAgeRange` when called with `requestAccess`. One
 * implementation rather than two, so the entry points cannot drift.
 *
 * Whether this presents Play's in-app prompt is Play's decision, not ours. It
 * shows UI only for an unsupervised user, in a region where sharing is a choice
 * rather than a legal requirement, whose Play setting is "ask before sharing",
 * and only until Play suppresses the prompt after repeated dismissals. In every
 * other case it resolves without showing anything.
 *
 * Requires a foreground Activity. There is no way to prompt without one, so a
 * null Activity resolves [AccessStatus.ERROR] — retryable, because a later call
 * from a foreground screen may well succeed.
 */
internal suspend fun performAccessRequest(
  manager: AgeSignalsManager,
  activity: Activity?
): String {
  if (activity == null) {
    Log.w(
      LOG_TAG,
      "No foreground Activity was available to request age sharing access from. " +
        "Play cannot present its consent prompt without one. Reporting a retryable error."
    )
    return AccessStatus.ERROR
  }

  val request = AgeSignalsAccessRequest.builder()
    .setActivity(activity)
    .build()

  return suspendCancellableCoroutine { cont ->
    manager.requestAgeSignalsAccess(request)
      .addOnSuccessListener { result ->
        cont.resume(toAccessStatus(result.ageSignalsStatus()))
      }
      .addOnFailureListener { throwable ->
        cont.resume(accessStatusForFailure(throwable))
      }
  }
}

/**
 * Maps Play's `AgeSignalsStatus` onto an `accessStatus` string.
 *
 * `UNSPECIFIED`, null, and any value added after this was written are reported
 * as an error rather than as "not shared". All of them mean we do not know the
 * user's intent, and recording a refusal the user never expressed would let a
 * caller cache it.
 */
private fun toAccessStatus(status: Int?): String {
  return when (status) {
    AgeSignalsStatus.SHARED -> AccessStatus.SHARED
    AgeSignalsStatus.NOT_SHARED -> AccessStatus.NOT_SHARED
    AgeSignalsStatus.VERIFICATION_REQUIRED -> AccessStatus.VERIFICATION_REQUIRED
    else -> {
      Log.w(
        LOG_TAG,
        "requestAgeSignalsAccess returned an unrecognised status ($status). " +
          "Reporting a retryable error rather than assuming the user refused."
      )
      AccessStatus.ERROR
    }
  }
}

/**
 * Maps a failed access request onto an `accessStatus`, using the same
 * terminal-versus-retryable rule as the read path — a device that can never
 * supply a signal cannot ever grant access either.
 */
private fun accessStatusForFailure(throwable: Throwable): String {
  val errorCode = (throwable as? AgeSignalsException)?.errorCode

  if (errorCode == null) {
    Log.w(
      LOG_TAG,
      "requestAgeSignalsAccess failed without a Play error code. Reporting a retryable error.",
      throwable
    )
    return AccessStatus.ERROR
  }

  return if (isTerminalPlayError(errorCode)) {
    Log.w(
      LOG_TAG,
      "requestAgeSignalsAccess failed with terminal code $errorCode. Reporting unavailable.",
      throwable
    )
    AccessStatus.UNAVAILABLE
  } else {
    Log.w(
      LOG_TAG,
      "requestAgeSignalsAccess failed with code $errorCode. Reporting a retryable error.",
      throwable
    )
    AccessStatus.ERROR
  }
}
