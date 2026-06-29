package expo.modules.agesignals

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability

class ReactNativeAgeSignalsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeAgeSignals")

    AsyncFunction("isSupported") { promise: Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.resolve(false)
      val available = GoogleApiAvailability.getInstance()
        .isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
      promise.resolve(available)
    }

    AsyncFunction("getAgeRange") { promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.resolve(
          mapOf("ageRange" to "unknown", "source" to "unavailable")
        )

      val available = GoogleApiAvailability.getInstance()
        .isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS

      if (!available) {
        return@AsyncFunction promise.resolve(
          mapOf("ageRange" to "unknown", "source" to "unavailable")
        )
      }

      // TODO: replace with Play Age Signals API once dependency confirmed
      // com.google.android.gms:play-services-games-v2 or dedicated age-signals artifact
      // See: https://developer.android.com/google/play/age-signals/overview
      promise.resolve(mapOf("ageRange" to "unknown", "source" to "unavailable"))
    }
  }
}
