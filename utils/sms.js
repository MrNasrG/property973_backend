const twilio = require('twilio');

/** Stored in verify_otp.otp_hash when Twilio Verify sends the code. */
const TWILIO_VERIFY_OTP_HASH = 'twilio:verify';

/** @type {import('twilio').Twilio | null} */
let cachedClient = null;

function env(name) {
    return String(process.env[name] || '').trim();
}

function twilioAccountSid() {
    return env('TWILIO_ACCOUNT_SID');
}

function twilioApiKeySid() {
    return env('TWILIO_API_KEY');
}

function twilioApiKeySecret() {
    return env('TWILIO_CLIENT_SECRET') || env('TWILIO_API_SECRET');
}

function twilioVerifyServiceSid() {
    return env('TWILIO_VERIFY_SERVICE_SID');
}

function twilioMessagingFrom() {
    return env('TWILIO_PHONE_NUMBER') || env('TWILIO_MESSAGING_FROM');
}

function usesTwilioVerify() {
    return Boolean(
        twilioAccountSid() &&
        twilioApiKeySid() &&
        twilioApiKeySecret() &&
        twilioVerifyServiceSid()
    );
}

function isSmsConfigured() {
    if (usesTwilioVerify()) return true;
    return Boolean(
        twilioAccountSid() &&
        twilioApiKeySid() &&
        twilioApiKeySecret() &&
        twilioMessagingFrom()
    );
}

function getTwilioClient() {
    if (cachedClient) return cachedClient;

    const accountSid = twilioAccountSid();
    const apiKeySid = twilioApiKeySid();
    const apiKeySecret = twilioApiKeySecret();

    if (!accountSid || !apiKeySid || !apiKeySecret) {
        throw new Error('Twilio credentials are not configured.');
    }

    cachedClient = twilio(apiKeySid, apiKeySecret, { accountSid });
    return cachedClient;
}

function otpExpiresMinutes() {
    const minutes = parseInt(String(process.env.OTP_EXPIRES_MINUTES || '10'), 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 10;
}

function shouldLogTwilioResponse() {
    const flag = env('TWILIO_LOG_RESPONSE') || env('SMS_LOG_OTP');
    if (flag === '1' || flag.toLowerCase() === 'true' || flag.toLowerCase() === 'yes') {
        return true;
    }
    return env('NODE_ENV') !== 'production';
}

/** @param {unknown} response */
function serializeTwilioResponse(response) {
    if (response && typeof response.toJSON === 'function') {
        return response.toJSON();
    }
    return response;
}

/**
 * @param {string} action
 * @param {unknown} responseBody
 * @param {Record<string, unknown>} [meta]
 */
function logTwilioResponse(action, responseBody, meta = {}) {
    if (!shouldLogTwilioResponse()) return;
    console.log(
        '[Twilio OTP]',
        JSON.stringify(
            {
                action,
                ...meta,
                responseBody: serializeTwilioResponse(responseBody)
            },
            null,
            2
        )
    );
}

/**
 * @param {string} action
 * @param {unknown} err
 * @param {Record<string, unknown>} [meta]
 */
function logTwilioError(action, err, meta = {}) {
    const error = /** @type {{ message?: string, status?: number, code?: number, moreInfo?: string, details?: unknown }} */ (
        err
    );
    console.error(
        '[Twilio OTP]',
        JSON.stringify(
            {
                action,
                ...meta,
                error: {
                    message: error?.message,
                    status: error?.status,
                    code: error?.code,
                    moreInfo: error?.moreInfo,
                    details: error?.details
                }
            },
            null,
            2
        )
    );
}

function buildOtpSmsBody(otp, purpose) {
    const appName = env('APP_NAME') || 'Property 973';
    const minutes = otpExpiresMinutes();
    const action = purpose ? ` to ${purpose}` : '';
    return `${appName}: Your verification code is ${otp}${action}. Valid for ${minutes} minutes.`;
}

/**
 * @param {string} mobileNumber E.164-style
 * @param {{ purpose?: string }} [opts]
 */
async function sendOtpViaVerify(mobileNumber, opts = {}) {
    const client = getTwilioClient();
    const serviceSid = twilioVerifyServiceSid();
    const validityPeriod = Math.min(Math.max(otpExpiresMinutes() * 60, 60), 600);
    const requestBody = {
        to: mobileNumber,
        channel: 'sms',
        locale: 'en',
        validityPeriod
    };

    try {
        const response = await client.verify.v2
            .services(serviceSid)
            .verifications.create(requestBody);
        logTwilioResponse('verify.send', response, {
            to: mobileNumber,
            purpose: opts.purpose || null,
            requestBody
        });
        return response;
    } catch (err) {
        logTwilioError('verify.send', err, {
            to: mobileNumber,
            purpose: opts.purpose || null,
            requestBody
        });
        throw err;
    }
}

/**
 * @param {string} mobileNumber
 * @param {string} otp
 * @param {{ purpose?: string }} [opts]
 */
async function sendOtpViaMessaging(mobileNumber, otp, opts = {}) {
    const client = getTwilioClient();
    const from = twilioMessagingFrom();
    const requestBody = {
        from,
        to: mobileNumber,
        body: buildOtpSmsBody(otp, opts.purpose)
    };

    try {
        const response = await client.messages.create(requestBody);
        logTwilioResponse('messages.send', response, {
            to: mobileNumber,
            purpose: opts.purpose || null,
            requestBody: { ...requestBody, body: '[redacted]' }
        });
        return response;
    } catch (err) {
        logTwilioError('messages.send', err, {
            to: mobileNumber,
            purpose: opts.purpose || null,
            requestBody: { ...requestBody, body: '[redacted]' }
        });
        throw err;
    }
}

/**
 * Send OTP via SMS (Twilio Verify when configured, otherwise Messaging API).
 * @param {string} mobileNumber E.164-style
 * @param {string} [otp] Required when not using Twilio Verify
 * @param {{ purpose?: string }} [opts]
 * @returns {Promise<void>}
 */
async function sendOtpSms(mobileNumber, otp, opts = {}) {
    if (usesTwilioVerify()) {
        await sendOtpViaVerify(mobileNumber, opts);
        return;
    }

    if (!isSmsConfigured()) {
        if (process.env.SMS_LOG_OTP === '1' || process.env.NODE_ENV !== 'production') {
            console.log(`[SMS stub] OTP for ${mobileNumber}: ${otp}`);
        }
        return;
    }

    if (!otp) {
        throw new Error('OTP code is required for SMS delivery.');
    }

    await sendOtpViaMessaging(mobileNumber, otp, opts);
}

/**
 * @param {string} mobileNumber
 * @param {string} otp
 * @returns {Promise<boolean>}
 */
async function verifyOtpSms(mobileNumber, otp) {
    if (!usesTwilioVerify()) {
        throw new Error('Twilio Verify is not configured.');
    }

    const client = getTwilioClient();
    const serviceSid = twilioVerifyServiceSid();
    const requestBody = { to: mobileNumber, code: otp };

    try {
        const response = await client.verify.v2
            .services(serviceSid)
            .verificationChecks.create(requestBody);
        logTwilioResponse('verify.check', response, {
            to: mobileNumber,
            requestBody: { ...requestBody, code: '[redacted]' }
        });
        return response.status === 'approved';
    } catch (err) {
        logTwilioError('verify.check', err, {
            to: mobileNumber,
            requestBody: { ...requestBody, code: '[redacted]' }
        });
        throw err;
    }
}

module.exports = {
    TWILIO_VERIFY_OTP_HASH,
    isSmsConfigured,
    usesTwilioVerify,
    sendOtpSms,
    verifyOtpSms
};
