package com.margelo.nitro.agesignals

import com.google.android.play.agesignals.testing.FakeAgeSignalsManager

/**
 * Holds the fake Play client installed by HybridAgeSignalsTesting, so that
 * HybridAgeSignals can pick it up in place of the real one.
 *
 * Null in every release build: HybridAgeSignalsTesting refuses to install a
 * fake unless the host application is debuggable.
 */
internal object FakeAgeSignalsStore {
  @Volatile
  var manager: FakeAgeSignalsManager? = null
}
