package com.sudomarc.handshake.callaudio

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.os.Handler
import android.os.Looper

/**
 * Best-effort WhatsApp call-state observer using user-authorized notification access.
 *
 * This observes call notifications only. It does not read notification message
 * content, record audio, or infer that speech analysis is running.
 */
class WhatsAppCallNotificationListener : NotificationListenerService() {
    companion object {
        const val ACTION_WHATSAPP_CALL_STATE =
            "com.sudomarc.handshake.overlay.WHATSAPP_CALL_STATE"
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

        val actionLabels = notification.actions.orEmpty()
            .mapNotNull { it.title?.toString() }
            .joinToString(" ")
            .lowercase()
        return listOf(
            "answer", "accept", "decline", "reject",
            "répondre", "accepter", "refuser",
            "atender", "contestar", "rechazar",
        ).any(actionLabels::contains)
    }

    private fun isIncoming(notification: Notification): Boolean {
        val actionLabels = notification.actions.orEmpty()
            .mapNotNull { it.title?.toString() }
            .joinToString(" ")
            .lowercase()
        val hasAnswerAction = listOf(
            "answer", "accept", "répondre", "accepter", "atender",
        ).any(actionLabels::contains)
        val hasDeclineAction = listOf(
            "decline", "reject", "refuser", "rechazar", "contestar",
        ).any(actionLabels::contains)
        if (hasAnswerAction && hasDeclineAction) return true

        val extras = notification.extras
        val visibleText = listOf(
            Notification.EXTRA_TITLE,
            Notification.EXTRA_TEXT,
            Notification.EXTRA_BIG_TEXT,
            Notification.EXTRA_SUB_TEXT,
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
