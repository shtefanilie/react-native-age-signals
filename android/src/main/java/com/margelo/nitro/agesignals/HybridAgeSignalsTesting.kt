package com.margelo.nitro.agesignals

import android.content.pm.ApplicationInfo
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.play.agesignals.AgeSignalsAccessResult
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsResult
import com.margelo.nitro.NitroModules

/**
 * Android-only test surface, exposed to JavaScript as
 * `react-native-age-signals/testing`.
 *
 * Every entry point refuses to run unless the host application is debuggable,
 * so a release build cannot have its age signals replaced by a fake.
 *
 * The read and the access request are staged separately, mirroring Play's own
 * two-function split: `setFakeResult` / `setFakeError` drive `checkAgeSignals`,
 * while `setFakeAccessStatus` / `setFakeAccessError` drive
 * `requestAgeSignalsAccess`. Exercising `getAgeRange({ requestAccess: true })`
 * end to end needs one of each, because Play only reports bounds once access
 * reports `SHARED`.
 *
 * Staging is additive across the two pairs and mutually exclusive within each —
 * see [FakeAgeSignalsStore].
 */
@Keep
@DoNotStrip
class HybridAgeSignalsTesting : HybridAgeSignalsTestingSpec() {
  override fun setFakeResult(ageLower: Double?, ageUpper: Double?) {
    requireDebuggable()

    FakeAgeSignalsStore.stageResult(
      AgeSignalsResult.builder()
        .setAgeLower(ageLower?.toInt())
        .setAgeUpper(ageUpper?.toInt())
        .build()
    )
  }

  override fun setFakeError(errorCode: Double) {
    requireDebuggable()
    FakeAgeSignalsStore.stageException(AgeSignalsException(errorCode.toInt()))
  }

  override fun setFakeAccessStatus(status: Double) {
    requireDebuggable()

    FakeAgeSignalsStore.stageAccessResult(
      AgeSignalsAccessResult.builder()
        .setAgeSignalsStatus(status.toInt())
        .build()
    )
  }

  override fun setFakeAccessError(errorCode: Double) {
    requireDebuggable()
    FakeAgeSignalsStore.stageAccessException(AgeSignalsException(errorCode.toInt()))
  }

  override fun clearFake() {
    requireDebuggable()
    FakeAgeSignalsStore.clear()
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
