package com.sudomarc.handshake.callaudio

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log

class AudioCaptureManager(private val context: Context) {

    companion object {
        private const val TAG = "CallAudioCapture"
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val FRAME_MS = 20
    }

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var captureThread: Thread? = null
    private var callback: AudioCaptureCallback? = null

    interface AudioCaptureCallback {
        fun onAudioData(data: ShortArray, timestamp: Long)
        fun onError(error: String)
        fun onStateChanged(state: String)
    }

    fun setCallback(callback: AudioCaptureCallback) {
        this.callback = callback
    }

    fun startCapture(audioSource: Int = MediaRecorder.AudioSource.MIC): Boolean {
        if (isRecording) {
            Log.w(TAG, "Already recording")
            return true
        }

        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) {
            callback?.onError("Invalid audio parameters")
            return false
        }

        val bufferSize = maxOf(minBufferSize, (SAMPLE_RATE * FRAME_MS / 1000 * 2).toInt())

        try {
            audioRecord = AudioRecord.Builder()
                .setAudioSource(audioSource)
                .setAudioFormat(
                    android.media.AudioFormat.Builder()
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(CHANNEL_CONFIG)
                        .setEncoding(AUDIO_FORMAT)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .build()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create AudioRecord", e)
            callback?.onError("AudioRecord creation failed: ${e.message}")
            return false
        }

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord not initialized: ${audioRecord?.state}")
            callback?.onError("AudioRecord initialization failed")
            audioRecord?.release()
            audioRecord = null
            return false
        }

        audioRecord?.startRecording()
        if (audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
            Log.e(TAG, "Failed to start recording")
            callback?.onError("Failed to start recording")
            audioRecord?.release()
            audioRecord = null
            return false
        }

        isRecording = true
        callback?.onStateChanged("RECORDING")

        captureThread = Thread({ captureLoop() }, "CallAudioCapture").apply { start() }

        Log.i(TAG, "Audio capture started: source=$audioSource, rate=$SAMPLE_RATE")
        return true
    }

    fun stopCapture() {
        isRecording = false
        captureThread?.interrupt()
        captureThread?.join(1000)
        captureThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        callback?.onStateChanged("STOPPED")
        Log.i(TAG, "Audio capture stopped")
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
                callback?.onAudioData(data, System.currentTimeMillis())
            } else if (read < 0) {
                Log.e(TAG, "AudioRecord read error: $read")
                callback?.onError("Audio read error: $read")
                break
            }
        }
    }

    fun isActive(): Boolean = isRecording

    fun getSampleRate(): Int = SAMPLE_RATE
    fun getChannels(): Int = 1
    fun getFrameMs(): Int = FRAME_MS
}