package com.sudomarc.handshake.callaudio

import android.app.Notification
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/** Best-effort WhatsApp call-state observer using user-authorized notification access. */
class WhatsAppCallNotificationListener : NotificationListenerService() {
    companion object {
        const val ACTION_WHATSAPP_CALL_STATE = "com.sudomarc.handshake.overlay.WHATSAPP_CALL_STATE"
        const val ACTION_REFRESH_WHATSAPP_CALL_STATE = "com.sudomarc.handshake.overlay.REFRESH_WHATSAPP_CALL_STATE"
        const val EXTRA_CALL_STATE = "whatsappCallState"
        private const val STATE_RINGING = "ringing"
        private const val STATE_ACTIVE = "active"
        private const val STATE_IDLE = "idle"
        private const val WHATSAPP = "com.whatsapp"
        private const val WHATSAPP_BUSINESS = "com.whatsapp.w4b"
    }

    private val handler = Handler(Looper.getMainLooper())
    private var lastPublishedState: String? = null
    private val refreshRunnable = Runnable { publishCurrentState() }
    private val refreshReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context?, intent: Intent?) {
            if (intent?.action == ACTION_REFRESH_WHATSAPP_CALL_STATE) scheduleRefresh(0L)
        }
    }

    override fun onCreate() {
        super.onCreate()
        val filter = android.content.IntentFilter(ACTION_REFRESH_WHATSAPP_CALL_STATE)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(refreshReceiver, filter, android.content.Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(refreshReceiver, filter)
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        publishCurrentState()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (isWhatsApp(sbn.packageName)) scheduleRefresh(250L)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        if (isWhatsApp(sbn.packageName)) scheduleRefresh(1200L)
    }

    override fun onDestroy() {
        handler.removeCallbacks(refreshRunnable)
        try {
            unregisterReceiver(refreshReceiver)
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    private fun scheduleRefresh(delayMs: Long) {
        handler.removeCallbacks(refreshRunnable)
        handler.postDelayed(refreshRunnable, delayMs)
    }

    private fun publishCurrentState() {
        val state = try {
            val calls = activeNotifications.orEmpty()
                .filter { isWhatsApp(it.packageName) && isCallNotification(it.notification) }
            when {
                calls.isEmpty() -> STATE_IDLE
                calls.any { isIncoming(it.notification) } -> STATE_RINGING
                else -> STATE_ACTIVE
            }
        } catch (_: SecurityException) {
            return
        } catch (_: Exception) {
            return
        }

        if (state == lastPublishedState) return
        lastPublishedState = state
        sendBroadcast(
            Intent(ACTION_WHATSAPP_CALL_STATE)
                .setPackage(packageName)
                .putExtra(EXTRA_CALL_STATE, state),
        )
    }

    private fun isWhatsApp(packageName: String): Boolean =
        packageName == WHATSAPP || packageName == WHATSAPP_BUSINESS

    private fun isCallNotification(notification: Notification): Boolean {
        if (notification.category == Notification.CATEGORY_CALL) return true
        if (notification.fullScreenIntent != null) return true
        val labels = notification.actions.orEmpty()
            .mapNotNull { it.title?.toString() }
            .joinToString(" ")
            .lowercase()
        return listOf("answer", "accept", "decline", "reject", "répondre", "accepter", "refuser")
            .any(labels::contains)
    }

    private fun isIncoming(notification: Notification): Boolean {
        val labels = notification.actions.orEmpty()
            .mapNotNull { it.title?.toString() }
            .joinToString(" ")
            .lowercase()
        val hasAnswer = listOf("answer", "accept", "répondre", "accepter", "atender")
            .any(labels::contains)
        val hasDecline = listOf("decline", "reject", "refuser", "rechazar")
            .any(labels::contains)
        if (hasAnswer && hasDecline) return true

        val extras = notification.extras
        val visibleText = listOf(
            Notification.EXTRA_TITLE, Notification.EXTRA_TEXT,
            Notification.EXTRA_BIG_TEXT, Notification.EXTRA_SUB_TEXT,
        ).mapNotNull { extras.getCharSequence(it)?.toString() }
            .joinToString(" ")
            .lowercase()
        return listOf(
            "incoming call", "incoming voice call", "incoming video call",
            "appel entrant", "appel vocal entrant", "appel vidéo entrant",
            "llamada entrante", "llamada de voz entrante",
        ).any(visibleText::contains)
    }
}
