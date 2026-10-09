package com.sudomarc.handshake.callaudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * Call-state observation + overlay rendering for Handshake Personal.
 *
 * RESPONSIBILITY BOUNDARY
 *
 * This service observes **call state only**. It does not receive, decode or
 * analyse carrier-call audio, and Android does not give it the private audio of
 * third-party calling apps such as WhatsApp. Anything it shows about *who* is on
 * the call comes from the trusted-pair backend, pushed in by the JS layer.
 *
 * HONESTY RULE (this is the reason the wording below is worded the way it is)
 *
 * The service never renders a protected/confirmed state on its own. It only
 * renders what `setCallState` last told it, and its default for an active call is
 * `unverified`. A previous build hard-coded "Handshake Protected" for every
 * answered call, which claimed a protection that did not exist; that string is
 * deliberately absent from this file.
 */
class HandshakeOverlayService : Service() {

    companion object {
        const val ACTION_PROTECTED = "com.sudomarc.handshake.overlay.PROTECTED"
        const val ACTION_RISK = "com.sudomarc.handshake.overlay.RISK"
        const val ACTION_STOP = "com.sudomarc.handshake.overlay.STOP"

        /** state = trusted | verify | risk */
        const val ACTION_SET_CALL_STATE = "com.sudomarc.handshake.overlay.SET_CALL_STATE"
        const val EXTRA_STATE = "state"
        const val EXTRA_TITLE = "title"
        const val EXTRA_MESSAGE = "message"
        const val EXTRA_DETAIL = "detail"

        private const val CHANNEL_ID = "handshake_overlay"
        private const val NOTIFICATION_ID = 1002

        // Kept in sync with mobile/lib/trust/callState.ts.
        private const val STATE_TRUSTED = "trusted"
        private const val STATE_VERIFY = "verify"
        private const val STATE_RISK = "risk"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var telephonyManager: TelephonyManager? = null
    private var vibrator: Vibrator? = null
    private var toneGenerator: ToneGenerator? = null

    private var callActive = false
    private var callRinging = false

    /** Last trust state pushed by the JS layer. Default is the honest default. */
    private var callState: String = STATE_VERIFY
    private var callStateDetail: String = ""
    /** Set once the backend has answered at least once during this call. */
    private var backendReachable = false

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
     * Legacy (API < 31) call-state listener. Safe to build here because a
     * Service is always constructed on the main thread, where Looper.myLooper()
     * (used by the no-arg constructor) is non-null.
     */
    private val legacyPhoneStateListener: PhoneStateListener? =
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            object : PhoneStateListener() {
                override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                    handleCallState(state)
                }
            }
        } else {
            null
        }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        telephonyManager = getSystemService(TELEPHONY_SERVICE) as TelephonyManager
        vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
        registerCallStateListener()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        when (intent?.action) {
            ACTION_SET_CALL_STATE -> applyCallState(intent)
            ACTION_RISK -> showRisk(
                intent.getStringExtra(EXTRA_TITLE) ?: "Risk detected",
                intent.getStringExtra(EXTRA_MESSAGE)
                    ?: "Handshake detected pressure tactics during this call.",
            )
            else -> renderCallState()
        }

        startAsForeground()
        return START_STICKY
    }

    private fun applyCallState(intent: Intent) {
        callState = intent.getStringExtra(EXTRA_STATE) ?: STATE_VERIFY
        callStateDetail = intent.getStringExtra(EXTRA_DETAIL).orEmpty()
        // Any state the JS layer pushes is a sign the backend was reachable at
        // the moment it was produced.
        backendReachable = callState != STATE_VERIFY || callStateDetail.isEmpty()
        renderCallState()
    }

    private fun registerCallStateListener() {
        try {
            val manager = telephonyManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let { callback ->
                    manager.registerTelephonyCallback(mainExecutor, callback)
                }
            } else {
                @Suppress("DEPRECATION")
                legacyPhoneStateListener?.let { listener ->
                    @Suppress("DEPRECATION")
                    manager.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
                }
            }
        } catch (_: SecurityException) {
            // READ_PHONE_STATE may not have been granted.
        } catch (_: Exception) {
            // Keep the service alive if an OEM blocks call-state callbacks.
        }
    }

    private fun unregisterCallStateListener() {
        try {
            val manager = telephonyManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let { manager.unregisterTelephonyCallback(it) }
            } else {
                @Suppress("DEPRECATION")
                legacyPhoneStateListener?.let { manager.listen(it, PhoneStateListener.LISTEN_NONE) }
            }
        } catch (_: Exception) {
        }
    }

    private fun handleCallState(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                callActive = true
                callRinging = true
                // A new call resets trust: whatever was true of the previous call
                // says nothing about this one.
                resetCallTrust()
                renderCallState()
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                callActive = true
                callRinging = false
                renderCallState()
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                callActive = false
                callRinging = false
                resetCallTrust()
                removeOverlay()
            }
        }
    }

    private fun resetCallTrust() {
        callState = STATE_VERIFY
        callStateDetail = ""
        backendReachable = false
    }

    private fun renderCallState() {
        if (!callActive) {
            removeOverlay()
            return
        }
        showCallState()
    }

    private fun startAsForeground() {
        val (title, text) = notificationCopy()
        val notification = buildNotification(title, text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun notificationCopy(): Pair<String, String> =
        if (!callActive) {
            "Handshake is watching" to "Waiting for a call."
        } else if (callRinging) {
            "Handshake · Phone call" to "Checking this call."
        } else when (callState) {
            STATE_TRUSTED -> "Handshake · Trusted connection" to
                "Both phones confirmed the same trusted relationship."
            STATE_RISK -> "Handshake · Risk detected" to
                "Pressure tactics detected during this call."
            else -> "Handshake · Verify" to
                (callStateDetail.ifEmpty { "Handshake cannot confirm this call." })
        }

    /**
     * Renders the pill for the current call.
     *
     * The label always names what Handshake actually knows. It never says
     * "Protected" unless the trusted-pair backend confirmed this exact call and
     * the JS layer verified the attestation.
     */
    private fun showCallState() {
        removeOverlay()

        val state = if (callRinging) STATE_VERIFY else callState
        val (labelText, dotColor, accent) = when (state) {
            STATE_TRUSTED ->
                Triple("Handshake · Trusted connection", Color.rgb(74, 222, 128), Color.rgb(40, 60, 48))
            STATE_RISK ->
                Triple("Handshake · Risk detected", Color.rgb(248, 113, 113), Color.rgb(60, 36, 38))
            else -> {
                // Offline is a distinct, honest case: not "protected", not an error.
                if (callActive && !callRinging && !backendReachable) {
                    Triple(
                        "Handshake · Verify",
                        Color.rgb(251, 191, 36),
                        Color.rgb(56, 48, 24),
                    )
                } else {
                    Triple("Handshake · Phone call", Color.rgb(163, 163, 163), Color.rgb(40, 44, 52))
                }
            }
        }

        val root = pillRoot(accent)
        val dot = TextView(this).apply {
            text = "●"
            textSize = 12f
            setTextColor(dotColor)
            setPadding(0, 0, 8, 0)
        }
        val label = TextView(this).apply {
            text = labelText
            setTextColor(Color.WHITE)
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
        }
        val detail = TextView(this).apply {
            text = if (callActive && !callRinging && callStateDetail.isNotEmpty()) {
                callStateDetail
            } else {
                ""
            }
            setTextColor(Color.rgb(170, 170, 170))
            textSize = 12f
            visibility = if (text.isEmpty()) View.GONE else View.VISIBLE
        }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        column.addView(label)
        column.addView(detail)

        val close = TextView(this).apply {
            text = "×"
            textSize = 20f
            setTextColor(Color.rgb(163, 163, 163))
            setPadding(16, 0, 0, 0)
            contentDescription = "Dismiss call warning"
            setOnClickListener { removeOverlay() }
        }

        root.addView(dot)
        root.addView(
            column,
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f),
        )
        root.addView(close)
        addOverlay(root)
    }

    private fun showRisk(title: String, message: String) {
        removeOverlay()
        alertUser()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(22, 18, 22, 18)
            background = roundedBackground(Color.rgb(18, 21, 26), Color.rgb(248, 113, 113), 18f)
            elevation = 18f
        }

        val eyebrow = TextView(this).apply {
            text = "HANDSHAKE"
            setTextColor(Color.rgb(251, 191, 36))
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.08f
        }
        val titleView = TextView(this).apply {
            text = title
            setTextColor(Color.WHITE)
            textSize = 21f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, 8, 0, 4)
        }
        val messageView = TextView(this).apply {
            text = message
            setTextColor(Color.rgb(212, 212, 212))
            textSize = 15f
            setLineSpacing(0f, 1.15f)
            setPadding(0, 0, 0, 8)
        }
        // Honest guidance: Handshake cannot verify this call, so the recovery
        // action is a known-number callback, not a code to read out.
        val guidance = TextView(this).apply {
            text = "Handshake could not confirm this call. Hang up and call back on a number you already know."
            setTextColor(Color.rgb(212, 212, 212))
            textSize = 14f
            setLineSpacing(0f, 1.15f)
            setPadding(0, 0, 0, 14)
        }

        val actions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
        }
        val dismiss = Button(this).apply {
            text = "Dismiss"
            setOnClickListener { renderCallState() }
        }
        // The old button dead-ended: it relaunched MainActivity, which ignored
        // the intent extra, and it left this card on screen. It now removes the
        // overlay first and hands over the trusted-people screen explicitly.
        val guidanceButton = Button(this).apply {
            text = "Trusted people"
            setOnClickListener {
                removeOverlay()
                openTrustedPeople()
            }
        }
        actions.addView(dismiss)
        actions.addView(guidanceButton)

        root.addView(eyebrow)
        root.addView(titleView)
        root.addView(messageView)
        root.addView(guidance)
        root.addView(actions)

        addOverlay(root)
    }

    private fun openTrustedPeople() {
        try {
            val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra(EXTRA_STATE, "trusted_people")
            }
            if (launch != null) startActivity(launch)
        } catch (_: Exception) {
        }
    }

    private fun alertUser() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 120, 80, 180), -1),
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(300)
            }
        } catch (_: Exception) {
        }

        try {
            toneGenerator?.release()
            toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90).also {
                it.startTone(ToneGenerator.TONE_PROP_BEEP2, 450)
            }
        } catch (_: Exception) {
            toneGenerator = null
        }
    }

    private fun pillRoot(accent: Int): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(16, 10, 14, 10)
            background = roundedBackground(Color.rgb(18, 21, 26), accent, 24f)
            elevation = 12f
        }
    }

    private fun roundedBackground(fill: Int, stroke: Int, radiusDp: Float): GradientDrawable {
        return GradientDrawable().apply {
            setColor(fill)
            setStroke(1, stroke)
            cornerRadius = radiusDp * resources.displayMetrics.density
        }
    }

    private fun addOverlay(view: View) {
        val density = resources.displayMetrics.density
        val params = WindowManager.LayoutParams(
            (360 * density).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            android.graphics.PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = (18 * density).toInt()
        }

        try {
            windowManager?.addView(view, params)
            overlayView = view
        } catch (_: Exception) {
            overlayView = null
        }
    }

    private fun removeOverlay() {
        overlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {
            }
        }
        overlayView = null
    }

    private fun buildNotification(title: String, text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Handshake Call Protection",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Persistent notification while Handshake is watching for calls."
        }
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(channel)
    }

    override fun onDestroy() {
        unregisterCallStateListener()
        removeOverlay()
        toneGenerator?.release()
        toneGenerator = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}