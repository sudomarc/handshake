package com.sudomarc.handshake.callaudio

import android.content.Intent

/**
 * Captures the overlay's launch-intent action so the JS layer can consume it.
 *
 * The gap report recorded that the previous build produced a
 * `handshakeOverlayAction="verify"` extra that nothing ever read: the button
 * relaunched `MainActivity`, which ignored the extra, and the risk card stayed
 * on screen. This holder is the missing reader. It stores the pending action
 * exactly once; `HandshakeOverlayModule.consumeOverlayAction()` takes and clears
 * it, so a rotation or a second render cannot replay a stale action.
 */
object MainActivityIntentBridge {

    const val EXTRA_ACTION = "state"
    const val ACTION_TRUSTED_PEOPLE = "trusted_people"

    @Volatile
    private var pendingAction: String? = null

    fun capture(intent: Intent?) {
        val action = intent?.getStringExtra(EXTRA_ACTION)
        if (!action.isNullOrBlank()) {
            pendingAction = action
        }
    }

    /** Returns the pending action and clears it. */
    fun consume(): String? {
        val action = pendingAction
        pendingAction = null
        return action
    }
}