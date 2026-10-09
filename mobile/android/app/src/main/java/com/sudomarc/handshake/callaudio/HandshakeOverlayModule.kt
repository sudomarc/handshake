package com.sudomarc.handshake.callaudio

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class HandshakeOverlayModule(
    private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "HandshakeOverlay"

    /**
     * Native → JS call-state events.
     *
     * The module lives in the RN process, which is also the host app process, so
     * it stays loaded — and emitting — while the app UI is backgrounded, as long
     * as the process is alive (e.g. while the foreground overlay service runs).
     *
     * JS subscription contract:
     *   NativeEventEmitter(NativeModules.HandshakeOverlay)
     *     .addListener("HandshakeCallState", ({ state, at }) => ...)
     *
     * `state` is one of "ringing" | "active" | "idle"; `at` is a
     * System.currentTimeMillis() timestamp in milliseconds.
     */
    private companion object {
        const val EVENT_CALL_STATE = "HandshakeCallState"
        const val STATE_RINGING = "ringing"
        const val STATE_ACTIVE = "active"
        const val STATE_IDLE = "idle"
    }

    private var telephonyManager: TelephonyManager? = null

    /** True while a call-state listener is actually registered. */
    private var callStateListenerActive = false

    /** Last state emitted to JS; events are only emitted on actual changes. */
    private var lastEmittedCallState: String? = null

    private val telephonyCallback: TelephonyCallback? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    handleCallState(state)
                }
            }
        } else {
            null
        }

    /**
     * Legacy (API < 31) call-state listener.
     *
     * Not constructed in the field initializer: the no-arg PhoneStateListener
     * binds to Looper.myLooper(), which is null on the React-context creation
     * thread and hard-crashed the process on Android 11 (API 30). It is built
     * lazily on the main thread in [registerCallStateListener] instead.
     */
    private var legacyPhoneStateListener: PhoneStateListener? = null

    private fun createLegacyPhoneStateListener(): PhoneStateListener =
        object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                handleCallState(state)
            }
        }

    override fun initialize() {
        super.initialize()
        registerCallStateListener()
    }

    override fun invalidate() {
        unregisterCallStateListener()
        super.invalidate()
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context))
    }

    /** True only after the user grants Android notification access to Handshake. */
    @ReactMethod
    fun isNotificationAccessEnabled(promise: Promise) {
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners",
        ).orEmpty()
        val listenerClass = WhatsAppCallNotificationListener::class.java.name
        promise.resolve(
            enabled.split(':').any { flattened ->
                val component = ComponentName.unflattenFromString(flattened)
                component != null &&
                    component.packageName == context.packageName &&
                    component.className == listenerClass
            },
        )
    }

    /** Opens the system's special-access screen; the user must enable Handshake manually. */
    @ReactMethod
    fun openNotificationAccessSettings(promise: Promise) {
        try {
            context.startActivity(
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("NOTIFICATION_ACCESS_SETTINGS_FAILED", error.message, error)
        }
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

        // Self-heal: if READ_PHONE_STATE was missing when the module was created,
        // retry registration now that JS is driving a call, so the native → JS
        // call-state bridge comes alive once the permission is granted.
        if (!callStateListenerActive) {
            registerCallStateListener()
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

    /**
     * Registers the module-side call-state listener so the JS layer receives
     * call-start events independently of the overlay service lifecycle.
     *
     * The service registers its own listener for its own overlay rendering; this
     * module listener is the native → JS event source. Both can be registered at
     * once. Registration is best-effort: READ_PHONE_STATE may not be granted yet,
     * in which case [setCallState] retries on every call, so the bridge comes
     * alive as soon as the permission is granted. The same callback instance is
     * reused and [callStateListenerActive] guards against double registration.
     */
    private fun registerCallStateListener() {
        if (callStateListenerActive) return
        try {
            if (telephonyManager == null) {
                telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            }
            val manager = telephonyManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let { callback ->
                    manager.registerTelephonyCallback(context.mainExecutor, callback)
                }
                callStateListenerActive = true
            } else {
                // PhoneStateListener must be built where a Looper exists. The
                // React-context thread has none, so build and register on the
                // main thread. Registration takes effect asynchronously;
                // setCallState()/retry re-invokes until it does.
                context.runOnUiQueueThread {
                    if (callStateListenerActive) return@runOnUiQueueThread
                    try {
                        val listener = legacyPhoneStateListener
                            ?: createLegacyPhoneStateListener().also {
                                legacyPhoneStateListener = it
                            }
                        @Suppress("DEPRECATION")
                        manager.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
                        callStateListenerActive = true
                    } catch (_: SecurityException) {
                        // READ_PHONE_STATE may not be granted yet.
                        callStateListenerActive = false
                    } catch (_: Exception) {
                        // Some OEMs restrict call-state callbacks.
                        callStateListenerActive = false
                    }
                }
            }
        } catch (_: SecurityException) {
            // READ_PHONE_STATE may not have been granted. Leave the listener
            // inactive; setCallState() will retry once the user grants it.
            callStateListenerActive = false
        } catch (_: Exception) {
            // Some OEMs restrict call-state callbacks; degrade gracefully.
            callStateListenerActive = false
        }
    }

    private fun unregisterCallStateListener() {
        if (!callStateListenerActive) return
        try {
            val manager = telephonyManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let { manager.unregisterTelephonyCallback(it) }
            } else {
                @Suppress("DEPRECATION")
                legacyPhoneStateListener?.let { manager.listen(it, PhoneStateListener.LISTEN_NONE) }
            }
        } catch (_: Exception) {
        } finally {
            callStateListenerActive = false
        }
    }

    private fun handleCallState(state: Int) {
        val mapped = when (state) {
            TelephonyManager.CALL_STATE_RINGING -> STATE_RINGING
            TelephonyManager.CALL_STATE_OFFHOOK -> STATE_ACTIVE
            TelephonyManager.CALL_STATE_IDLE -> STATE_IDLE
            else -> return
        }
        if (mapped == lastEmittedCallState) return
        lastEmittedCallState = mapped
        emitCallState(mapped)
    }

    private fun emitCallState(state: String) {
        try {
            val payload: WritableMap = Arguments.createMap().apply {
                putString("state", state)
                putDouble("at", System.currentTimeMillis().toDouble())
            }
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_CALL_STATE, payload)
        } catch (_: Exception) {
            // The RN bridge may be tearing down; never crash the process.
        }
    }
}
