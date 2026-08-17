package com.margelo.nitro.agesignals

import android.annotation.SuppressLint
import android.content.Context
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.google.android.play.agesignals.model.AgeSignalsVerificationStatus
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
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
            val ageRange = when (result.userStatus()) {
              AgeSignalsVerificationStatus.SUPERVISED,
              AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_PENDING,
              AgeSignalsVerificationStatus.SUPERVISED_APPROVAL_DENIED -> {
                val upper = result.ageUpper()
                when {
                  upper == null -> "child"
                  upper <= 12 -> "child"
                  upper <= 17 -> "teen"
                  else -> "adult"
                }
              }
              AgeSignalsVerificationStatus.VERIFIED -> "adult"
              AgeSignalsVerificationStatus.DECLARED -> {
                val lower = result.ageLower()
                val upper = result.ageUpper()
                when {
                  upper != null && upper <= 12 -> "child"
                  upper != null && upper <= 17 -> "teen"
                  lower != null && lower >= 18 -> "adult"
                  else -> "unknown"
                }
              }
              else -> "unknown"
            }
            cont.resume(AgeRangeResult(ageRange = ageRange, source = "google"))
          }
          .addOnFailureListener { e ->
            cont.resumeWithException(e)
          }
      }
    }
  }
}
