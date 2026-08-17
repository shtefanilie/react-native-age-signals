package com.margelo.nitro.agesignals

import android.annotation.SuppressLint
import android.content.Context
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
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

      val manager = try {
        AgeSignalsManagerFactory.create(context)
      } catch (e: Exception) {
        return@async AgeRangeResult(ageRange = "unknown", source = "unavailable")
      }

      val request = AgeSignalsRequest.builder().build()

      suspendCancellableCoroutine { cont ->
        manager.checkAgeSignals(request)
          .addOnSuccessListener { result ->
            val ageRange = toAgeRange(result.ageLower(), result.ageUpper())
            cont.resume(AgeRangeResult(ageRange = ageRange, source = "google"))
          }
          .addOnFailureListener {
            cont.resume(AgeRangeResult(ageRange = "unknown", source = "error"))
          }
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
   * AgeSignalsResult.userStatus(). The bounds arrive over the Play Store IPC
   * bundle under the "age.range.lower" and "age.range.upper" keys, which are
   * stable across age-signals 0.0.3 and 0.0.4. The key backing userStatus()
   * ("user.status") was dropped in 0.0.4 in favour of "age.range.source", so
   * branching on it would silently degrade every result to "unknown" against a
   * newer Play Store.
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
}
