package com.sudomarc.handshake.callaudio

import android.util.Log

class VADProcessor {

    companion object {
        private const val TAG = "VADProcessor"
        private const val FRAME_MS = 20
        private const val SAMPLE_RATE = 16000
        private const val FRAME_SIZE = SAMPLE_RATE * FRAME_MS / 1000
    }

    private var speechFrames = 0
    private var silenceFrames = 0
    private var totalFrames = 0
    private var maxLevel = 0.0
    private var minLevel = Double.MAX_VALUE
    private var sumLevel = 0.0

    private val energyThreshold = 0.01
    private val speechFrameThreshold = 5
    private val silenceFrameThreshold = 15

    enum class State {
        SILENCE,
        SPEECH,
        UNKNOWN
    }

    data class Result(
        val state: State,
        val inputLevel: Float,
        val speechDetected: Boolean,
        val framesProcessed: Int,
        val durationMs: Long
    )

    fun process(frame: ShortArray): Result {
        totalFrames++

        var sum = 0.0
        for (sample in frame) {
            val normalized = sample.toDouble() / 32768.0
            sum += normalized * normalized
        }
        val rms = Math.sqrt(sum / frame.size)
        val level = (rms * 100).toFloat()

        maxLevel = maxOf(maxLevel, rms)
        minLevel = minOf(minLevel, rms)
        sumLevel += rms

        val isSpeech = rms > energyThreshold

        if (isSpeech) {
            speechFrames++
            silenceFrames = 0
        } else {
            silenceFrames++
            speechFrames = 0
        }

        val state = when {
            speechFrames >= speechFrameThreshold -> State.SPEECH
            silenceFrames >= silenceFrameThreshold -> State.SILENCE
            else -> State.UNKNOWN
        }

        return Result(
            state = state,
            inputLevel = level,
            speechDetected = isSpeech,
            framesProcessed = totalFrames,
            durationMs = (totalFrames * FRAME_MS).toLong()
        )
    }

    fun getStats() = mapOf(
        "framesProcessed" to totalFrames,
        "speechFrames" to speechFrames,
        "silenceFrames" to silenceFrames,
        "maxLevel" to maxLevel,
        "minLevel" to if (minLevel == Double.MAX_VALUE) 0.0 else minLevel,
        "avgLevel" to if (totalFrames > 0) sumLevel / totalFrames else 0.0,
        "durationMs" to (totalFrames * FRAME_MS).toLong()
    )

    fun reset() {
        speechFrames = 0
        silenceFrames = 0
        totalFrames = 0
        maxLevel = 0.0
        minLevel = Double.MAX_VALUE
        sumLevel = 0.0
    }
}