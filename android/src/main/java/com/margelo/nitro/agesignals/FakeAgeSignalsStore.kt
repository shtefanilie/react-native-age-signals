package com.margelo.nitro.agesignals

import com.google.android.play.agesignals.AgeSignalsAccessResult
import com.google.android.play.agesignals.AgeSignalsException
import com.google.android.play.agesignals.AgeSignalsResult
import com.google.android.play.agesignals.testing.FakeAgeSignalsManager

/**
 * Holds the fake Play client installed by [HybridAgeSignalsTesting], so that
 * [HybridAgeSignals] and [HybridAgeSignalsAccess] can pick it up in place of the
 * real one.
 *
 * Null in every release build: [HybridAgeSignalsTesting] refuses to install a
 * fake unless the host application is debuggable.
 *
 * This object owns the *intent* — which result or error is staged for the read,
 * and which for the access request — and rebuilds the fake from it on every
 * change. That indirection buys two things `FakeAgeSignalsManager` cannot give
 * us directly:
 *
 *  - **Unstaging.** The fake prefers a staged exception over a staged result and
 *    exposes no way to remove one, so staging a result after an error would
 *    otherwise be silently ignored. Rebuilding applies only what is currently
 *    intended.
 *  - **Independence.** The read and the access request are staged separately, and
 *    a realistic scenario needs both at once (Play only reports bounds once
 *    access says `SHARED`). Rebuilding preserves whichever was staged first.
 */
internal object FakeAgeSignalsStore {
  @Volatile
  var manager: FakeAgeSignalsManager? = null
    private set

  private var result: AgeSignalsResult? = null
  private var exception: AgeSignalsException? = null
  private var accessResult: AgeSignalsAccessResult? = null
  private var accessException: AgeSignalsException? = null

  @Synchronized
  fun stageResult(value: AgeSignalsResult) {
    result = value
    exception = null
    rebuild()
  }

  @Synchronized
  fun stageException(value: AgeSignalsException) {
    exception = value
    result = null
    rebuild()
  }

  @Synchronized
  fun stageAccessResult(value: AgeSignalsAccessResult) {
    accessResult = value
    accessException = null
    rebuild()
  }

  @Synchronized
  fun stageAccessException(value: AgeSignalsException) {
    accessException = value
    accessResult = null
    rebuild()
  }

  @Synchronized
  fun clear() {
    result = null
    exception = null
    accessResult = null
    accessException = null
    manager = null
  }

  private fun rebuild() {
    manager = FakeAgeSignalsManager().apply {
      result?.let { setNextAgeSignalsResult(it) }
      exception?.let { setNextAgeSignalsException(it) }
      accessResult?.let { setNextAgeSignalsAccessResult(it) }
      accessException?.let { setNextRequestAgeSignalsAccessException(it) }
    }
  }
}
