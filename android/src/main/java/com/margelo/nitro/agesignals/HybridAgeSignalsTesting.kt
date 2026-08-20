package com.margelo.nitro.agesignals

import android.content.pm.ApplicationInfo
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsResult
import com.google.android.play.agesignals.testing.FakeAgeSignalsManager
import com.margelo.nitro.NitroModules

/**
 * Android-only test surface, exposed to JavaScript as
 * `react-native-age-signals/testing`.
 *
 * Every entry point refuses to run unless the host application is debuggable,
 * so a release build cannot have its age signals replaced by a fake.
 */
@Keep
@DoNotStrip
class HybridAgeSignalsTesting : HybridAgeSignalsTestingSpec() {
  override fun setFakeResult(ageLower: Double?, ageUpper: Double?) {
    val result = AgeSignalsResult.builder()
      .setAgeLower(ageLower?.toInt())
      .setAgeUpper(ageUpper?.toInt())
      .build()

    // Assigning a result does not clear a previously assigned exception, and
    // FakeAgeSignalsManager prefers the exception when both are present. Use a
    // fresh fake so the caller gets the result they just asked for.
    FakeAgeSignalsStore.manager = requireDebuggableFake().apply {
      setNextAgeSignalsResult(result)
    }
  }

  override fun setFakeError(errorCode: Double) {
    FakeAgeSignalsStore.manager = requireDebuggableFake().apply {
      setNextAgeSignalsException(AgeSignalsException(errorCode.toInt()))
    }
  }

  override fun clearFake() {
    requireDebuggable()
    FakeAgeSignalsStore.manager = null
  }

  private fun requireDebuggableFake(): FakeAgeSignalsManager {
    requireDebuggable()
    return FakeAgeSignalsManager()
  }

  private fun requireDebuggable() {
    val context = NitroModules.applicationContext
      ?: throw IllegalStateException(
        "react-native-age-signals/testing was called before the React context was available."
      )

    val isDebuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    if (!isDebuggable) {
      throw IllegalStateException(
        "react-native-age-signals/testing only works in a debuggable build, and this " +
          "application is not debuggable. Remove the call from your release build."
      )
    }
  }
}
