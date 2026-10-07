package com.sudomarc.handshake.callaudio

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class HandshakeOverlayModule(
    private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "HandshakeOverlay"

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context))
    }

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        promise.resolve(true)
    }

    @ReactMethod
    fun startProtection(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            promise.reject("OVERLAY_PERMISSION_REQUIRED", "Allow Handshake to display over other apps first.")
            return
        }

        try {
            val intent = Intent(context, HandshakeOverlayService::class.java).apply {
                action = HandshakeOverlayService.ACTION_PROTECTED
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("OVERLAY_START_FAILED", error.message, error)
        }
    }

    /**
     * Pushes the trust state for the current call into the overlay.
     *
     * `state` is one of trusted | verify | risk. There is no "protected" option:
     * a confirmed trusted-pair session is the only thing that may claim trust,
     * and the JS layer only sends it after verifying the server's attestation
     * locally. Offline therefore surfaces as `verify`, never as a false claim.
     */
    @ReactMethod
    fun setCallState(state: String, detail: String, promise: Promise) {
        if (state !in setOf("trusted", "verify", "risk")) {
            promise.reject("OVERLAY_INVALID_STATE", "Unknown call state.")
            return
        }

        try {
            val intent = Intent(context, HandshakeOverlayService::class.java).apply {
                action = HandshakeOverlayService.ACTION_SET_CALL_STATE
                putExtra(HandshakeOverlayService.EXTRA_STATE, state)
                putExtra(HandshakeOverlayService.EXTRA_DETAIL, detail)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("OVERLAY_START_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun showRisk(title: String, message: String, promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            promise.reject("OVERLAY_PERMISSION_REQUIRED", "Allow Handshake to display over other apps first.")
            return
        }

        try {
            val intent = Intent(context, HandshakeOverlayService::class.java).apply {
                action = HandshakeOverlayService.ACTION_RISK
                putExtra(HandshakeOverlayService.EXTRA_TITLE, title)
                putExtra(HandshakeOverlayService.EXTRA_MESSAGE, message)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("OVERLAY_START_FAILED", error.message, error)
        }
    }

    /**
     * Returns the launch-intent action set by the overlay, once.
     *
     * This is the consumer that was missing in the previous build: the service
     * produced a launch extra that nothing read, so its call-time action
     * relaunched the app without navigating anywhere. See
     * `MainActivityIntentBridge`.
     */
    @ReactMethod
    fun consumeOverlayAction(promise: Promise) {
        promise.resolve(MainActivityIntentBridge.consume())
    }

    @ReactMethod
    fun stopProtection(promise: Promise) {
        context.stopService(Intent(context, HandshakeOverlayService::class.java))
        promise.resolve(true)
    }
}
