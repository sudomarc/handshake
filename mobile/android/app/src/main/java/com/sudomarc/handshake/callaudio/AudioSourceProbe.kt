package com.sudomarc.handshake.callaudio

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.MediaRecorder
import android.os.Build
import android.util.Log

/**
 * Native audio-access feasibility probe.
 *
 * This is the on-device half of the Audio Source Manager. For one call it
 * attempts, in priority order, the candidate audio sources and records the
 * outcome of each of the four access stages separately:
 *
 *   1. declared      — the source constant is available on this API level
 *   2. granted       — creating the AudioRecord did not throw (permission/signature)
 *   3. opened        — startRecording() succeeded and returned non-silenced samples
 *   4. remote voice  — attribution (never `true` for a microphone; only a genuine
 *                      telephony downlink/uplink source can carry remote-only audio)
 *
 * Stage 4 is decided in TypeScript (`sourceManager.ts`); this probe only
 * measures stages 1–3 plus the measured RMS energy and the platform's own
 * `isClientSilenced()` answer, which is the honest in-device truth for whether a
 * capture is usable.
 *
 * Nothing here is logged beyond a fixed tag, and no audio is stored or
 * transmitted: only per-source stage results and a scalar RMS value leave this
 * class.
 */
object AudioSourceProbe {
    private const val TAG = "HandshakeAudioProbe"

    /** One candidate source's measured outcome. */
    data class CandidateResult(
        val kind: String,
        val declared: Boolean,
        val granted: Boolean,
        val grantedEvidence: String?,
        val opened: Boolean,
        val silenced: Boolean,
        val measuredRms: Float,
        val error: String?,
    )

    data class ProbeResult(
        val audioMode: String,
        val accessibilityCaptureAvailable: Boolean,
        val candidates: List<CandidateResult>,
    )

    /**
     * Runs the full probe. Blocking (it reads audio frames), so callers must run
     * it off the main thread.
     */
    @JvmStatic
    fun probe(audioManager: AudioManager, accessibilityCaptureAvailable: Boolean): ProbeResult {
        val modeName = modeName(audioManager.mode)
        Log.i(TAG, "probe start mode=$modeName a11y=$accessibilityCaptureAvailable")

        val candidates = mutableListOf<CandidateResult>()

        // 1. Privileged telephony downlink — expected to fail stage 2 for a
        //    normal app (CAPTURE_AUDIO_OUTPUT is system-only). Recorded as
        //    structured evidence, never as usable audio.
        candidates += attemptSource(
            kind = "privileged_downlink",
            audioSource = MediaRecorder.AudioSource.VOICE_DOWNLINK,
            audioManager = audioManager,
        )

        // 2. Ordinary microphone — the realistic fallback. Its audio is a
        //    local+remote mixture, so stage 4 is decided downstream as
        //    "not isolated", but stages 1–3 are measured honestly here.
        candidates += attemptSource(
            kind = "ordinary_mic",
            audioSource = MediaRecorder.AudioSource.MIC,
            audioManager = audioManager,
        )

        val result = ProbeResult(modeName, accessibilityCaptureAvailable, candidates)
        Log.i(TAG, "probe done " + summarize(result))
        return result
    }

    private fun attemptSource(
        kind: String,
        audioSource: Int,
        audioManager: AudioManager,
    ): CandidateResult {
        if (Build.VERSION.SDK_INT < 23 && audioSource == MediaRecorder.AudioSource.VOICE_DOWNLINK) {
            // VOICE_DOWNLINK is API 24+; below that it is simply not declared.
            return CandidateResult(kind, declared = false, granted = false,
                grantedEvidence = null, opened = false, silenced = false,
                measuredRms = 0f, error = "not declared below API 24")
        }

        var record: AudioRecord? = null
        return try {
            val channel = AudioFormat.CHANNEL_IN_MONO
            val encoding = AudioFormat.ENCODING_PCM_16BIT
            val sampleRate = 16_000
            val minBuffer = AudioRecord.getMinBufferSize(sampleRate, channel, encoding)
            val bufferSize = maxOf(minBuffer, sampleRate / 5 * 2) // ≥200ms

            record = AudioRecord.Builder()
                .setAudioSource(audioSource)
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(encoding)
                        .setSampleRate(sampleRate)
                        .setChannelMask(channel)
                        .build(),
                )
                .setBufferSizeInBytes(bufferSize)
                .build()

            if (record.state != AudioRecord.STATE_INITIALIZED) {
                return CandidateResult(kind, declared = true, granted = false,
                    grantedEvidence = "AudioRecord not initialised", opened = false,
                    silenced = false, measuredRms = 0f, error = "state!=INITIALIZED")
            }

            record.startRecording()
            if (record.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                record.release()
                return CandidateResult(kind, declared = true, granted = true,
                    grantedEvidence = null, opened = false, silenced = false,
                    measuredRms = 0f, error = "startRecording had no effect")
            }

            // Read ~200ms of frames and measure RMS so "opened" means "returned
            // samples", not just "start() did not throw".
            val frames = 4
            val perFrame = bufferSize / frames
            val buffer = ShortArray(perFrame)
            var energySum = 0.0
            var energyCount = 0
            repeat(frames) {
                val read = record.read(buffer, 0, buffer.size)
                if (read > 0) {
                    var sum = 0.0
                    for (i in 0 until read) {
                        val sample = buffer[i] / 32768.0
                        sum += sample * sample
                    }
                    energySum += kotlin.math.sqrt(sum / read)
                    energyCount += 1
                }
            }
            val rms = if (energyCount > 0) (energySum / energyCount).toFloat() else 0f
            val silenced = isClientSilenced(audioManager, audioSource)

            record.stop()
            record.release()

            CandidateResult(kind, declared = true, granted = true, grantedEvidence = null,
                opened = true, silenced = silenced, measuredRms = rms, error = null)
        } catch (security: SecurityException) {
            // Stage 2 blocked: the source requires a signature/system permission.
            Log.i(TAG, "$kind stage2 denied: ${security.message}")
            CandidateResult(kind, declared = true, granted = false,
                grantedEvidence = security.message, opened = false, silenced = false,
                measuredRms = 0f, error = "SecurityException")
        } catch (t: Throwable) {
            Log.i(TAG, "$kind failed: ${t.message}")
            CandidateResult(kind, declared = true, granted = false,
                grantedEvidence = null, opened = false, silenced = false,
                measuredRms = 0f, error = t.javaClass.simpleName)
        } finally {
            try {
                record?.release()
            } catch (_: Throwable) {
                // ignore double-release
            }
        }
    }

    /**
     * Asks the platform whether the client is currently being silenced by the
     * capture policy. This is the in-device truth for "opened but silent".
     */
    private fun isClientSilenced(audioManager: AudioManager, audioSource: Int): Boolean {
        if (Build.VERSION.SDK_INT < 24) return false
        return try {
            val configs: List<AudioRecordingConfiguration> = audioManager.activeRecordingConfigurations
            configs.any { config ->
                config.clientAudioSource == audioSource && config.isClientSilenced
            }
        } catch (_: Throwable) {
            false
        }
    }

    private fun modeName(mode: Int): String = when (mode) {
        AudioManager.MODE_IN_CALL -> "MODE_IN_CALL"
        AudioManager.MODE_IN_COMMUNICATION -> "MODE_IN_COMMUNICATION"
        AudioManager.MODE_RINGTONE -> "MODE_RINGTONE"
        AudioManager.MODE_NORMAL -> "MODE_NORMAL"
        AudioManager.MODE_CALL_SCREENING -> "MODE_CALL_SCREENING"
        else -> "MODE_$mode"
    }

    private fun summarize(result: ProbeResult): String =
        result.candidates.joinToString(prefix = "[", postfix = "]") { c ->
            "${c.kind}(granted=${c.granted} opened=${c.opened} silenced=${c.silenced} " +
                "rms=${"%.4f".format(c.measuredRms)} err=${c.error ?: "-"})"
        }
}
