package com.sudomarc.handshake.callaudio

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallAudioModule(reactApplicationContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactApplicationContext), AudioCaptureManager.AudioCaptureCallback {

    companion object {
        private const val TAG = "CallAudioModule"
        private const val EVENT_AUDIO_DATA = "CallAudioData"
        private const val EVENT_AUDIO_STATE = "CallAudioState"
        private const val EVENT_CALL_SCREEN = "CallScreenEvent"
        private const val EVENT_VAD_RESULT = "CallVADResult"
        private const val EVENT_ERROR = "CallAudioError"
    }

    private val audioManager = AudioCaptureManager(reactApplicationContext)
    private var vadProcessor = VADProcessor()
    private var callScreeningService: CallScreeningServiceImpl? = null
    private var audioService: CallAudioService? = null
    private var useForegroundService = false

    init {
        audioManager.setCallback(this)
    }

    override fun getName(): String = "CallAudioModule"

    @ReactMethod
    fun startMicrophoneCapture(promise: Promise) {
        Log.i(TAG, "startMicrophoneCapture")
        val success = audioManager.startCapture(MediaRecorder.AudioSource.MIC)
        if (success) {
            promise.resolve(mapOf("status" to "started", "source" to "MIC"))
        } else {
            promise.reject("AUDIO_START_FAILED", "Failed to start microphone capture")
        }
    }

    @ReactMethod
    fun startVoiceRecognitionCapture(promise: Promise) {
        Log.i(TAG, "startVoiceRecognitionCapture")
        val success = audioManager.startCapture(MediaRecorder.AudioSource.VOICE_RECOGNITION)
        if (success) {
            promise.resolve(mapOf("status" to "started", "source" to "VOICE_RECOGNITION"))
        } else {
            promise.reject("AUDIO_START_FAILED", "Failed to start voice recognition capture")
        }
    }

    @ReactMethod
    fun startVoiceCommunicationCapture(promise: Promise) {
        Log.i(TAG, "startVoiceCommunicationCapture")
        val success = audioManager.startCapture(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
        if (success) {
            promise.resolve(mapOf("status" to "started", "source" to "VOICE_COMMUNICATION"))
        } else {
            promise.reject("AUDIO_START_FAILED", "Failed to start voice communication capture")
        }
    }

    @ReactMethod
    fun stopCapture(promise: Promise) {
        Log.i(TAG, "stopCapture")
        audioManager.stopCapture()
        vadProcessor.reset()
        promise.resolve(mapOf("status" to "stopped"))
    }

    @ReactMethod
    fun startForegroundCapture(promise: Promise) {
        Log.i(TAG, "startForegroundCapture")
        useForegroundService = true
        val intent = Intent(reactApplicationContext, CallAudioService::class.java).apply {
            action = "START"
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
        promise.resolve(mapOf("status" to "foreground_started"))
    }

    @ReactMethod
    fun stopForegroundCapture(promise: Promise) {
        Log.i(TAG, "stopForegroundCapture")
        val intent = Intent(reactApplicationContext, CallAudioService::class.java).apply {
            action = "STOP"
        }
        reactApplicationContext.startService(intent)
        useForegroundService = false
        promise.resolve(mapOf("status" to "foreground_stopped"))
    }

    @ReactMethod
    fun getAudioConfig(promise: Promise) {
        promise.resolve(mapOf(
            "sampleRate" to audioManager.getSampleRate(),
            "channels" to audioManager.getChannels(),
            "frameMs" to audioManager.getFrameMs()
        ))
    }

    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(mapOf("recording" to audioManager.isActive()))
    }

    @ReactMethod
    fun enableCallScreening(promise: Promise) {
        Log.i(TAG, "enableCallScreening")
        callScreeningService = CallScreeningServiceImpl()
        callScreeningService?.setCallCallback { details ->
            sendEvent(EVENT_CALL_SCREEN, mapOf(
                "callId" to details.callId,
                "phoneNumber" to details.phoneNumber.orEmpty(),
                "direction" to details.direction,
                "isIncoming" to details.isIncoming,
                "timestamp" to details.timestamp,
                "verificationStatus" to details.verificationStatus
            ))
        }
        promise.resolve(mapOf("status" to "enabled"))
    }

    @ReactMethod
    fun disableCallScreening(promise: Promise) {
        callScreeningService?.clearCallCallback()
        callScreeningService = null
        promise.resolve(mapOf("status" to "disabled"))
    }

    private fun sendEvent(eventName: String, params: Map<String, Any>) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun onAudioData(data: ShortArray, timestamp: Long) {
        sendEvent(EVENT_AUDIO_DATA, mapOf(
            "data" to data,
            "timestamp" to timestamp,
            "sampleRate" to audioManager.getSampleRate(),
            "channels" to audioManager.getChannels()
        ))

        val vadResult = vadProcessor.process(data)
        sendEvent(EVENT_VAD_RESULT, mapOf(
            "state" to vadResult.state.name,
            "inputLevel" to vadResult.inputLevel,
            "speechDetected" to vadResult.speechDetected,
            "framesProcessed" to vadResult.framesProcessed,
            "durationMs" to vadResult.durationMs
        ))
    }

    override fun onError(error: String) {
        Log.e(TAG, "Audio error: $error")
        sendEvent(EVENT_ERROR, mapOf("error" to error))
    }

    override fun onStateChanged(state: String) {
        sendEvent(EVENT_AUDIO_STATE, mapOf("state" to state))
    }
}