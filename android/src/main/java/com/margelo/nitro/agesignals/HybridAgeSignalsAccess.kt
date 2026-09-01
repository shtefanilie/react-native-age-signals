package com.margelo.nitro.agesignals

import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

/**
 * Android-only age-sharing consent surface, exposed to JavaScript as
 * `requestAgeSignalsAccess()`.
 *
 * Separate from [HybridAgeSignals] so that nitrogen emits no Swift for it: Apple
 * has no equivalent step, since `AgeRangeService.requestAgeRange` presents its
 * sheet and returns the range in a single call.
 *
 * The work itself lives in [performAccessRequest], shared with
 * `HybridAgeSignals.getAgeRange(requestAccess = true)`, so the two entry points
 * cannot classify the same Play response differently.
 */
@Keep
@DoNotStrip
class HybridAgeSignalsAccess : HybridAgeSignalsAccessSpec() {
  override fun requestAgeSignalsAccess(): Promise<String> {
    return Promise.async {
      val reactContext = NitroModules.applicationContext
        ?: return@async AccessStatus.UNAVAILABLE

      val manager = FakeAgeSignalsStore.manager ?: try {
        AgeSignalsManagerFactory.create(reactContext)
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not create the Play age signals client. Reporting unavailable.", e)
        return@async AccessStatus.UNAVAILABLE
      }

      performAccessRequest(manager, reactContext.currentActivity)
    }
  }
}
