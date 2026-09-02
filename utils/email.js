const nodemailer = require('nodemailer');
const {
    getBrandLogoAttachment,
    buildOtpEmailHtml,
    buildOtpEmailText,
    buildPasswordResetEmailHtml,
    buildPasswordResetEmailText,
    buildWelcomeEmailHtml
} = require('./emailTemplates');

function isEmailConfigured() {
    return Boolean(
        process.env.EMAIL_HOST &&
        process.env.EMAIL_USERNAME &&
        process.env.EMAIL_PASSWORD
    );
}

/** @type {import('nodemailer').Transporter | null} */
let cachedTransporter = null;

function getTransporter() {
    if (cachedTransporter) return cachedTransporter;

    const port = Number(process.env.EMAIL_PORT) || 587;
    const secure = (process.env.EMAIL_SECURE || '').trim() === '1' || port === 465;

    cachedTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port,
        secure,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        },
        ...(secure
            ? {}
            : {
                  requireTLS: true,
                  tls: { minVersion: 'TLSv1.2' }
              })
    });

    return cachedTransporter;
}

/**
 * Verify SMTP credentials and connectivity without sending mail.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function verifyEmailSmtp() {
    if (!isEmailConfigured()) {
        return {
            ok: false,
            error:
                'Email is not configured. Set EMAIL_HOST, EMAIL_USERNAME, and EMAIL_PASSWORD in config.env.'
        };
    }

    try {
        const transporter = getTransporter();
        await transporter.verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message || 'SMTP verify failed.' };
    }
}

/**
 * @param {{ email: string, subject: string, message: string, text?: string }} options
 */
const sendEmail = async (options) => {
    if (!isEmailConfigured()) {
        const logInDev =
            process.env.EMAIL_LOG_LINK === '1' ||
            (process.env.NODE_ENV || '').trim().toLowerCase() !== 'production';
        if (logInDev) {
            console.log(`[Email stub] To: ${options.email}`);
            console.log(`[Email stub] Subject: ${options.subject}`);
            console.log(`[Email stub] ${options.message}`);
            return;
        }
        throw new Error(
            'Email is not configured. Set EMAIL_HOST, EMAIL_USERNAME, and EMAIL_PASSWORD in config.env.'
        );
    }

    const transporter = getTransporter();
    const logoAttachment = getBrandLogoAttachment();
    const attachments = logoAttachment ? [logoAttachment] : [];

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
        to: options.email,
        subject: options.subject,
        html: options.message,
        ...(options.text ? { text: options.text } : {}),
        ...(attachments.length ? { attachments } : {})
    });
};

/**
 * @param {string} email
 * @param {{ name?: string | null, otp: string, purpose?: string }} opts
 */
async function sendOtpEmail(email, opts) {
    const subject = process.env.EMAIL_OTP_SUBJECT || 'Your verification code';
    await sendEmail({
        email,
        subject,
        message: buildOtpEmailHtml(opts),
        text: buildOtpEmailText(opts)
    });
}

/**
 * @param {string} email
 * @param {{ name?: string | null, resetUrl: string }} opts
 */
async function sendPasswordResetEmail(email, opts) {
    const subject = process.env.EMAIL_FORGET_PSWD_SUBJECT || 'Reset your password';
    await sendEmail({
        email,
        subject,
        message: buildPasswordResetEmailHtml(opts),
        text: buildPasswordResetEmailText(opts)
    });
}

/**
 * @param {string} email
 * @param {{ name?: string | null }} opts
 */
async function sendWelcomeEmail(email, opts = {}) {
    const subject = process.env.EMAIL_WELCOME_SUBJECT || 'Welcome';
    await sendEmail({
        email,
        subject,
        message: buildWelcomeEmailHtml(opts)
    });
}

module.exports = sendEmail;
module.exports.isEmailConfigured = isEmailConfigured;
module.exports.verifyEmailSmtp = verifyEmailSmtp;
module.exports.sendOtpEmail = sendOtpEmail;
module.exports.sendPasswordResetEmail = sendPasswordResetEmail;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
