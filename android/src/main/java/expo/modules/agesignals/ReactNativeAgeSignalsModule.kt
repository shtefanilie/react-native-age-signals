package expo.modules.agesignals

import android.content.Context
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.model.AgeSignalsVerificationStatus
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ReactNativeAgeSignalsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeAgeSignals")

    AsyncFunction("isSupported") { promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.resolve(false)
      try {
        AgeSignalsManagerFactory.create(context)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    AsyncFunction("getAgeRange") { promise: Promise ->
      val context: Context = appContext.reactContext
        ?: return@AsyncFunction promise.resolve(
          mapOf("ageRange" to "unknown", "source" to "unavailable")
        )

      val manager = try {
        AgeSignalsManagerFactory.create(context)
      } catch (e: Exception) {
        return@AsyncFunction promise.resolve(
          mapOf("ageRange" to "unknown", "source" to "unavailable")
        )
      }

      val request = AgeSignalsRequest.builder().build()

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
          promise.resolve(mapOf("ageRange" to ageRange, "source" to "google"))
        }
        .addOnFailureListener { e ->
          promise.resolve(mapOf("ageRange" to "unknown", "source" to "unavailable"))
        }
    }
  }
}
