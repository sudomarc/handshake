package com.sudomarc.handshake.callaudio

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.telecom.CallScreeningService.CallResponse
import android.util.Log

class CallScreeningServiceImpl : CallScreeningService() {

    companion object {
        private const val TAG = "CallScreeningService"
        private const val VERIFICATION_STATUS_UNKNOWN = -1
    }

    private var callCallback: ((CallDetails) -> Unit)? = null

    data class CallDetails(
        val callId: String,
        val phoneNumber: String?,
        val direction: Int,
        val timestamp: Long,
        val isIncoming: Boolean,
        var verificationStatus: Int = VERIFICATION_STATUS_UNKNOWN,
    )

    override fun onScreenCall(callDetails: Call.Details) {
        val phoneNumber = callDetails.handle?.schemeSpecificPart

        val direction = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            callDetails.callDirection
        } else {
            Call.Details.DIRECTION_UNKNOWN
        }

        val createdAt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            callDetails.creationTimeMillis
        } else {
            0L
        }

        val verificationStatus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            callDetails.callerNumberVerificationStatus
        } else {
            VERIFICATION_STATUS_UNKNOWN
        }

        Log.i(TAG, "onScreenCall: $phoneNumber, direction: $direction")

        val details = CallDetails(
            callId = buildCallId(createdAt, phoneNumber, direction),
            phoneNumber = phoneNumber,
            direction = direction,
            timestamp = System.currentTimeMillis(),
            isIncoming = direction == Call.Details.DIRECTION_INCOMING,
            verificationStatus = verificationStatus
        )

        callCallback?.invoke(details)

        // respondToCall() is ignored by the platform unless the direction is
        // DIRECTION_INCOMING, and must be called within 5s of onScreenCall().
        if (details.isIncoming) {
            val builder = CallResponse.Builder()
                .setDisallowCall(false)
                .setRejectCall(false)
                .setSkipCallLog(false)
                .setSkipNotification(false)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                builder.setSilenceCall(false)
            }

            respondToCall(callDetails, builder.build())
        }
    }

    /**
     * Call.Details.getTelecomCallId() is annotated @hide/@TestApi in AOSP, so it is
     * stripped from the public android.jar and is blocked from API 30. There is no
     * public Telecom call identifier here, so compose one from the properties
     * onScreenCall() guarantees: creationTimeMillis, handle and callDirection.
     */
    private fun buildCallId(createdAt: Long, phoneNumber: String?, direction: Int): String {
        return "$createdAt-$direction-${phoneNumber.orEmpty()}"
    }

    fun setCallCallback(callback: (CallDetails) -> Unit) {
        callCallback = callback
    }

    fun clearCallCallback() {
        callCallback = null
    }
}