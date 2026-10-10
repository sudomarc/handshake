package com.sudomarc.handshake.callaudio

import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * React Native bridge for [AudioSourceProbe].
 *
 * Exposes a single `probe()` method that runs the on-device audio-access
 * feasibility probe off the main thread and resolves with a structured report:
 *
 *   {
 *     audioMode: string,
 *     accessibilityCaptureAvailable: boolean,
 *     candidates: [
 *       { kind, declared, granted, grantedEvidence, opened, silenced, measuredRms, error }
 *     ]
 *   }
 *
 * The TypeScript Audio Source Manager (`mobile/lib/audio/sourceManager.ts`)
 * consumes this report and decides, per the four-stage honesty rules, whether
 * any source may feed the risk pipeline. This module only measures — it never
 * selects a source and never claims remote-voice attribution.
 */
class HandshakeAudioProbeModule(
    private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "HandshakeAudioProbe"

    @ReactMethod
    fun probe(promise: Promise) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        if (audioManager == null) {
            promise.reject("PROBE_UNAVAILABLE", "AudioManager is not available.")
            return
        }

        // Accessibility capture availability: Handshake does not itself run an
        // accessibility service yet, so this reports whether *any* accessibility
        // service is enabled on the device (the platform treats those as
        // capture-policy exempt). Reported as a fact, not a capability claim.
        val a11yEnabled = isAnyAccessibilityServiceEnabled()

        // The probe reads audio frames, so it must not run on the main thread.
        Thread {
            try {
                val result = AudioSourceProbe.probe(audioManager, a11yEnabled)
                promise.resolve(toMap(result))
            } catch (t: Throwable) {
                promise.reject("PROBE_FAILED", t.message, t)
            }
        }.start()
    }

    private fun isAnyAccessibilityServiceEnabled(): Boolean {
        return try {
            val enabled = android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            )
            !enabled.isNullOrEmpty()
        } catch (_: Throwable) {
            false
        }
    }

    private fun toMap(result: AudioSourceProbe.ProbeResult): WritableMap {
        val map = Arguments.createMap()
        map.putString("audioMode", result.audioMode)
        map.putBoolean("accessibilityCaptureAvailable", result.accessibilityCaptureAvailable)

        val array: WritableArray = Arguments.createArray()
        for (c in result.candidates) {
            val item = Arguments.createMap()
            item.putString("kind", c.kind)
            item.putBoolean("declared", c.declared)
            item.putBoolean("granted", c.granted)
            if (c.grantedEvidence != null) item.putString("grantedEvidence", c.grantedEvidence)
            item.putBoolean("opened", c.opened)
            item.putBoolean("silenced", c.silenced)
            item.putDouble("measuredRms", c.measuredRms.toDouble())
            if (c.error != null) item.putString("error", c.error)
            array.pushMap(item)
        }
        map.putArray("candidates", array)
        return map
    }
}
