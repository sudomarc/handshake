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
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class HandshakeOverlayService : Service() {

    companion object {
        const val ACTION_PROTECTED = "com.sudomarc.handshake.overlay.PROTECTED"
        const val ACTION_RISK = "com.sudomarc.handshake.overlay.RISK"
        const val ACTION_STOP = "com.sudomarc.handshake.overlay.STOP"
        const val EXTRA_TITLE = "title"
        const val EXTRA_MESSAGE = "message"

        private const val CHANNEL_ID = "handshake_overlay"
        private const val NOTIFICATION_ID = 1002
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        startAsForeground()

        when (intent?.action) {
            ACTION_RISK -> showRisk(
                intent.getStringExtra(EXTRA_TITLE) ?: "Risk detected",
                intent.getStringExtra(EXTRA_MESSAGE) ?: "Handshake detected a suspicious interaction.",
            )
            ACTION_STOP -> stopSelf()
            else -> showProtected()
        }

        return START_STICKY
    }

    private fun startAsForeground() {
        val notification = buildNotification(
            "Handshake Protection",
            "Call protection is armed. Tap Handshake to manage it.",
        )
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

    private fun showProtected() {
        removeOverlay()

        val root = pillRoot()
        val dot = TextView(this).apply {
            text = "●"
            textSize = 12f
            setTextColor(Color.rgb(74, 222, 128))
            setPadding(0, 0, 8, 0)
        }
        val label = TextView(this).apply {
            text = "Handshake Protected"
            setTextColor(Color.WHITE)
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
        }
        val close = TextView(this).apply {
            text = "×"
            textSize = 22f
            setTextColor(Color.rgb(163, 163, 163))
            setPadding(16, 0, 0, 0)
            setOnClickListener { stopSelf() }
        }

        root.addView(dot)
        root.addView(label, LinearLayout.LayoutParams(0, -2, 1f))
        root.addView(close)
        addOverlay(root)
    }

    private fun showRisk(title: String, message: String) {
        removeOverlay()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(22, 18, 22, 18)
            background = roundedBackground(Color.rgb(18, 21, 26), Color.rgb(248, 113, 113), 18f)
            elevation = 18f
        }

        val eyebrow = TextView(this).apply {
            text = "HANDSHAKE • CALL PROTECTION"
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
            setPadding(0, 0, 0, 14)
        }

        val actions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
        }
        val dismiss = Button(this).apply {
            text = "Dismiss"
            setOnClickListener { showProtected() }
        }
        val verify = Button(this).apply {
            text = "Verify identity"
            setOnClickListener {
                val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    putExtra("handshakeOverlayAction", "verify")
                }
                if (launch != null) startActivity(launch)
            }
        }
        actions.addView(dismiss)
        actions.addView(verify)

        root.addView(eyebrow)
        root.addView(titleView)
        root.addView(messageView)
        root.addView(actions)

        addOverlay(root)
    }

    private fun pillRoot(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(16, 10, 14, 10)
            background = roundedBackground(Color.rgb(18, 21, 26), Color.rgb(40, 44, 52), 24f)
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
            description = "Visible notification while the cross-app call protection overlay is armed."
        }
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(channel)
    }

    override fun onDestroy() {
        removeOverlay()
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
