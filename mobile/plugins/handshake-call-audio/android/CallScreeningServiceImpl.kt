package com.sudomarc.handshake.callaudio

import android.telecom.Call
import android.telecom.CallScreeningService
import android.telecom.CallResponse
import android.util.Log

class CallScreeningServiceImpl : CallScreeningService() {

    companion object {
        private const val TAG = "CallScreeningService"
    }

    private var callCallback: ((CallDetails) -> Unit)? = null

    data class CallDetails(
        val callId: String,
        val phoneNumber: String?,
        val direction: Int,
        val timestamp: Long,
        val isIncoming: Boolean,
        var verificationStatus: Int = -1,
    )

    override fun onScreenCall(callDetails: Call.Details) {
        Log.i(TAG, "onScreenCall: ${callDetails.handle?.schemeSpecificPart}, direction: ${callDetails.callDirection}")

        val details = CallDetails(
            callId = callDetails.telecomCallId,
            phoneNumber = callDetails.handle?.schemeSpecificPart,
            direction = callDetails.callDirection,
            timestamp = System.currentTimeMillis(),
            isIncoming = callDetails.callDirection == Call.Details.DIRECTION_INCOMING,
            verificationStatus = callDetails.callerNumberVerificationStatus
        )

        callCallback?.invoke(details)

        val response = if (details.isIncoming) {
            CallResponse.Builder()
                .setDisallowCall(false)
                .setRejectCall(false)
                .setSilenceCall(false)
                .setSkipCallLog(false)
                .setSkipNotification(false)
                .build()
        } else {
            CallResponse.Builder()
                .setDisallowCall(false)
                .build()
        }

        respondToCall(callDetails, response)
    }

    fun setCallCallback(callback: (CallDetails) -> Unit) {
        callCallback = callback
    }

    fun clearCallCallback() {
        callCallback = null
    }
}