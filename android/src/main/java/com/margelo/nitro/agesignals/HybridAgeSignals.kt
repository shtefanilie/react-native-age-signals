package com.margelo.nitro.agesignals

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.google.android.play.agesignals.model.AgeSignalsErrorCode
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

  override fun getAgeRange(): Promise<AgeRangeResult> {
    return Promise.async {
      val context: Context = NitroModules.applicationContext
        ?: return@async AgeRangeResult(ageRange = "unknown", source = "unavailable")

      val manager = FakeAgeSignalsStore.manager ?: try {
        AgeSignalsManagerFactory.create(context)
      } catch (e: Exception) {
        Log.w(TAG, "Could not create the Play age signals client. Reporting unavailable.", e)
        return@async AgeRangeResult(ageRange = "unknown", source = "unavailable")
      }

      val request = AgeSignalsRequest.builder().build()

      suspendCancellableCoroutine { cont ->
        manager.checkAgeSignals(request)
          .addOnSuccessListener { result ->
            val ageRange = toAgeRange(result.ageLower(), result.ageUpper())
            cont.resume(AgeRangeResult(ageRange = ageRange, source = "google"))
          }
          .addOnFailureListener { throwable ->
            cont.resume(AgeRangeResult(ageRange = "unknown", source = sourceForFailure(throwable)))
          }
      }
    }
  }

  /**
   * Maps a `checkAgeSignals` failure onto `source`, which is what tells a caller
   * whether retrying is worthwhile.
   *
   * The distinction matters because a consumer typically caches the outcome, and
   * caching a transient failure makes it permanent. `unavailable` means "do not
   * ask this device again"; `error` means "ask again next launch".
   *
   * Only codes that no user action can resolve are treated as terminal. The
   * "outdated" and "not found" Play codes are deliberately transient: a user who
   * updates the Play Store or Play Services would then get a real signal, and
   * caching `unavailable` would hide that from them until they reinstalled.
   *
   * The same rule is applied to Apple's error cases in ios/HybridAgeSignals.swift.
   * Change both together.
   */
  private fun sourceForFailure(throwable: Throwable): String {
    val errorCode = (throwable as? AgeSignalsException)?.errorCode

    if (errorCode == null) {
      Log.w(TAG, "checkAgeSignals failed without a Play error code. Reporting a retryable error.", throwable)
      return "error"
    }

    return when (errorCode) {
      AgeSignalsErrorCode.API_NOT_AVAILABLE,
      AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND,
      AgeSignalsErrorCode.APP_NOT_OWNED,
      AgeSignalsErrorCode.SDK_VERSION_OUTDATED -> {
        Log.w(TAG, "checkAgeSignals failed with terminal code $errorCode. Reporting unavailable.", throwable)
        "unavailable"
      }
      else -> {
        Log.w(TAG, "checkAgeSignals failed with code $errorCode. Reporting a retryable error.", throwable)
        "error"
      }
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
   * AgeSignalsResult.userStatus(). Comparing the 0.0.3 and 0.0.4 AARs confirms
   * `ageLower()` / `ageUpper()` are unchanged while `userStatus()` was removed in
   * 0.0.4 (alongside a new `ageRangeSource()`), so branching on it would fail to
   * compile against the newer SDK. The bounds are the portable choice.
   *
   * The IPC bundle keys behind those accessors ("age.range.lower" /
   * "age.range.upper", versus "user.status" giving way to "age.range.source") are
   * inferred from the same class comparison rather than from Google's changelog,
   * which was not reachable when this was written.
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

  private companion object {
    const val TAG = "AgeSignals"
  }
}
