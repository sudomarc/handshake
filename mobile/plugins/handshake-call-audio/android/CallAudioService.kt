package com.sudomarc.handshake.callaudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class CallAudioService : Service() {

    companion object {
        private const val TAG = "CallAudioService"
        private const val CHANNEL_ID = "handshake_call_audio"
        private const val NOTIFICATION_ID = 1001
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val FRAME_MS = 20
    }

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var captureThread: Thread? = null
    private var callback: ((ShortArray, Long) -> Unit)? = null
    private var stateCallback: ((String) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: "START"
        when (action) {
            "START" -> startCapture()
            "STOP" -> stopCapture()
        }
        return START_STICKY
    }

    private fun startCapture() {
        if (isRecording) return

        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        val bufferSize = maxOf(minBufferSize, (SAMPLE_RATE * FRAME_MS / 1000 * 2).toInt())

        audioRecord = AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.MIC)
            .setAudioFormat(
                android.media.AudioFormat.Builder()
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(CHANNEL_CONFIG)
                    .setEncoding(AUDIO_FORMAT)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .build()

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord init failed")
            stateCallback?.invoke("ERROR")
            stopSelf()
            return
        }

        audioRecord?.startRecording()
        if (audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
            Log.e(TAG, "Start recording failed")
            stateCallback?.invoke("ERROR")
            stopSelf()
            return
        }

        isRecording = true
        stateCallback?.invoke("RECORDING")

        val notification = buildNotification("Call Audio Active", "Handshake is monitoring call audio")
        startForeground(NOTIFICATION_ID, notification, Build.VERSION_CODES.R)

        captureThread = Thread({ captureLoop() }, "CallAudioCapture").apply { start() }
        Log.i(TAG, "Foreground audio capture started")
    }

    private fun stopCapture() {
        isRecording = false
        captureThread?.interrupt()
        captureThread?.join(1000)
        captureThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        stopForeground(true)
        stateCallback?.invoke("STOPPED")
        stopSelf()
        Log.i(TAG, "Foreground audio capture stopped")
    }

    private fun captureLoop() {
        val frameSize = (SAMPLE_RATE * FRAME_MS / 1000).toInt()
        val buffer = ShortArray(frameSize)

        while (isRecording && !Thread.currentThread().isInterrupted) {
            val audioRecord = this.audioRecord
            if (audioRecord == null) break

            val read = audioRecord.read(buffer, 0, frameSize)
            if (read > 0) {
                val data = if (read == frameSize) buffer else buffer.copyOf(read)
                callback?.invoke(data, System.currentTimeMillis())
            } else if (read < 0) {
                Log.e(TAG, "Read error: $read")
                break
            }
        }
    }

    private fun buildNotification(title: String, text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Handshake Call Audio",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Foreground service for call audio monitoring"
        }
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopCapture()
        super.onDestroy()
    }

    fun setDataCallback(callback: (ShortArray, Long) -> Unit) {
        this.callback = callback
    }

    fun setStateCallback(callback: (String) -> Unit) {
        this.stateCallback = callback
    }

    fun isActive(): Boolean = isRecording
}