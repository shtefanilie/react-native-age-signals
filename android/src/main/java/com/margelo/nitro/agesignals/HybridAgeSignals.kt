package com.margelo.nitro.agesignals

import android.annotation.SuppressLint
import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsManager
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

@Keep
@DoNotStrip
@SuppressLint("MissingPermission")
class HybridAgeSignals : HybridAgeSignalsSpec() {
  /**
   * Reports whether the Play Age Signals client can be constructed at all.
   *
   * This is a weak check by necessity: `AgeSignalsManagerFactory.create` only
   * builds a client around the context and performs no availability probe, and
   * the SDK exposes nothing else to ask. So this returns true on essentially any
   * device where the class loads, regardless of whether a signal is obtainable.
   *
   * That is acceptable because it is not the load-bearing check. `getAgeRange`
   * classifies Play's own error code, so a device that cannot supply a signal is
   * reported as `unavailable` from there rather than being predicted here.
   */
  override fun isSupported(): Promise<Boolean> {
    return Promise.async {
      val context = NitroModules.applicationContext
        ?: return@async false
      return@async try {
        AgeSignalsManagerFactory.create(context)
        true
      } catch (e: Exception) {
        false
      }
    }
  }

  /**
   * Reads the user's age range from Play.
   *
   * Play's 0.0.4 SDK splits this into two calls: age sharing access has to be
   * granted before `checkAgeSignals` reports any bounds at all. When access was
   * never requested — or was requested and refused — the response arrives with
   * `ageLower` and `ageUpper` absent, which this maps to `unknown`.
   *
   * `requestAccess` is therefore what decides whether this call can produce a
   * real answer for a user who has not already opted in. It defaults to false so
   * that upgrading this library cannot introduce a system prompt into a call site
   * that never had one; a caller who wants the signal opts in explicitly.
   */
  override fun getAgeRange(requestAccess: Boolean?): Promise<AgeRangeResult> {
    return Promise.async {
      // Deliberately the ReactApplicationContext rather than a plain Context:
      // requesting access needs the foreground Activity, and this is the only
      // handle nitro gives us onto it.
      val reactContext = NitroModules.applicationContext
        ?: return@async unavailable()

      val manager = FakeAgeSignalsStore.manager ?: try {
        AgeSignalsManagerFactory.create(reactContext)
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not create the Play age signals client. Reporting unavailable.", e)
        return@async unavailable()
      }

      var accessStatus: String? = null

      if (requestAccess == true) {
        accessStatus = performAccessRequest(manager, reactContext.currentActivity)

        if (accessStatus != AccessStatus.SHARED) {
          // Play will report no bounds, so reading would only produce `unknown`
          // with no indication of why. Report the access outcome instead.
          return@async AgeRangeResult(
            ageRange = "unknown",
            source = sourceForAccessStatus(accessStatus),
            accessStatus = accessStatus
          )
        }
      }

      readAgeRange(manager, accessStatus)
    }
  }

  private suspend fun readAgeRange(
    manager: AgeSignalsManager,
    accessStatus: String?
  ): AgeRangeResult {
    val request = AgeSignalsRequest.builder().build()

    return suspendCancellableCoroutine { cont ->
      manager.checkAgeSignals(request)
        .addOnSuccessListener { result ->
          cont.resume(
            AgeRangeResult(
              ageRange = toAgeRange(result.ageLower(), result.ageUpper()),
              source = "google",
              accessStatus = accessStatus
            )
          )
        }
        .addOnFailureListener { throwable ->
          cont.resume(
            AgeRangeResult(
              ageRange = "unknown",
              source = sourceForFailure(throwable),
              accessStatus = accessStatus
            )
          )
        }
    }
  }

  /**
   * Maps an access outcome that stopped the read onto `source`.
   *
   * `notShared` becomes `declined`, which already meant exactly this on iOS.
   * Note that Play cannot distinguish "dismissed the prompt" from "Never Share"
   * from "prompt suppressed", so on Android a `declined` may go stale if the
   * user later changes their Play setting — see the README before caching it.
   *
   * `verificationRequired` becomes `error` rather than `unavailable`, because
   * the user can resolve it in the Play Store and a caller must not cache it
   * away. `source` records whether retrying is worthwhile, and here it is; the
   * precise reason travels in `accessStatus`.
   */
  private fun sourceForAccessStatus(accessStatus: String): String {
    return when (accessStatus) {
      AccessStatus.NOT_SHARED -> "declined"
      AccessStatus.UNAVAILABLE -> "unavailable"
      else -> "error"
    }
  }

  /**
   * Maps a `checkAgeSignals` failure onto `source`, which is what tells a caller
   * whether retrying is worthwhile.
   *
   * The terminal-versus-retryable rule itself lives in [isTerminalPlayError], so
   * that the read path and the access request cannot classify the same code
   * differently.
   */
  private fun sourceForFailure(throwable: Throwable): String {
    val errorCode = (throwable as? AgeSignalsException)?.errorCode

    if (errorCode == null) {
      Log.w(LOG_TAG, "checkAgeSignals failed without a Play error code. Reporting a retryable error.", throwable)
      return "error"
    }

    return if (isTerminalPlayError(errorCode)) {
      Log.w(LOG_TAG, "checkAgeSignals failed with terminal code $errorCode. Reporting unavailable.", throwable)
      "unavailable"
    } else {
      Log.w(LOG_TAG, "checkAgeSignals failed with code $errorCode. Reporting a retryable error.", throwable)
      "error"
    }
  }

  /**
   * Maps a reported age range onto our coarse buckets: child is under 13,
   * teen is 13 to 17, adult is 18 and over.
   *
   * These thresholds are duplicated in ios/HybridAgeSignals.swift. Change both
   * together.
   *
   * Deliberately derived from the age bounds alone rather than from
   * `AgeSignalsResult.userStatus()`. Google's 0.0.4 release notes deprecate
   * `userStatus` outright, replacing it with `ageRangeSource` and
   * `significantChangeStatus`, while `ageLower()` / `ageUpper()` are unchanged.
   * The bounds are the version-portable choice.
   *
   * The IPC bundle keys behind those accessors corroborate this: `0.0.3` carries
   * `age.range.lower`, `age.range.upper` and `user.status`, while `0.0.4` carries
   * the two range keys plus `age.range.source` and no `user.status` at all.
   *
   * A null upper bound is normal, not an error — Play reports it for the highest
   * band, so an 18+ user arrives as lower 18 with no upper. Both bounds are null
   * when age sharing was never granted.
   */
  private fun toAgeRange(lower: Int?, upper: Int?): String {
    return when {
      upper != null && upper <= 12 -> "child"
      upper != null && upper <= 17 -> "teen"
      upper != null -> "adult"
      lower != null && lower >= 18 -> "adult"
      else -> "unknown"
    }
  }

  private fun unavailable() =
    AgeRangeResult(ageRange = "unknown", source = "unavailable", accessStatus = null)
}
