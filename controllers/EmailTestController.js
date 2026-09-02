const validator = require('validator');
const sendEmail = require('../utils/email');
const { isEmailConfigured, verifyEmailSmtp } = sendEmail;

function isEmailTestAllowed(req) {
    const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
    const enabled = (process.env.EMAIL_TEST_ENABLED || '').trim() === '1';
    const secret = (process.env.EMAIL_TEST_SECRET || '').trim();

    if (nodeEnv === 'production' && !enabled) {
        return false;
    }

    if (secret) {
        const provided = (
            req.get('X-Email-Test-Secret') ||
            (req.body && req.body.secret) ||
            ''
        ).trim();
        return provided === secret;
    }

    return true;
}

function emailConfigSummary() {
    return {
        configured: isEmailConfigured(),
        host: process.env.EMAIL_HOST || null,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: (process.env.EMAIL_SECURE || '').trim() === '1',
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || null,
        username: process.env.EMAIL_USERNAME || null
    };
}

/** GET /api/email/status — check SMTP config and connection (no email sent) */
async function emailStatus(req, res) {
    if (!isEmailTestAllowed(req)) {
        return res.status(403).json({
            success: false,
            message:
                'Email test API is disabled. Set EMAIL_TEST_ENABLED=1 in production or use a non-production NODE_ENV.'
        });
    }

    const summary = emailConfigSummary();
    if (!summary.configured) {
        return res.status(503).json({
            success: false,
            message:
                'Email is not configured. Set EMAIL_HOST, EMAIL_USERNAME, and EMAIL_PASSWORD in config.env.',
            data: summary
        });
    }

    const verify = await verifyEmailSmtp();
    if (!verify.ok) {
        return res.status(502).json({
            success: false,
            message: verify.error || 'SMTP connection failed.',
            data: { ...summary, smtpVerified: false }
        });
    }

    return res.status(200).json({
        success: true,
        message: 'SMTP connection verified.',
        data: { ...summary, smtpVerified: true }
    });
}

/** POST /api/email/test — send a test message { "email": "you@example.com" } */
async function sendTest(req, res) {
    if (!isEmailTestAllowed(req)) {
        return res.status(403).json({
            success: false,
            message:
                'Email test API is disabled. Set EMAIL_TEST_ENABLED=1 in production or use a non-production NODE_ENV.'
        });
    }

    const to = String((req.body && req.body.email) || '')
        .trim()
        .toLowerCase();
    if (!to) {
        return res.status(400).json({
            success: false,
            message: 'email is required in the request body.'
        });
    }
    if (!validator.isEmail(to)) {
        return res.status(400).json({
            success: false,
            message: 'Valid email is required.'
        });
    }

    const summary = emailConfigSummary();
    if (!summary.configured) {
        return res.status(503).json({
            success: false,
            message:
                'Email is not configured. Set EMAIL_HOST, EMAIL_USERNAME, and EMAIL_PASSWORD in config.env.',
            data: summary
        });
    }

    const verify = await verifyEmailSmtp();
    if (!verify.ok) {
        return res.status(502).json({
            success: false,
            message: verify.error || 'SMTP connection failed.',
            data: { ...summary, smtpVerified: false }
        });
    }

    const appName = (process.env.APP_NAME || 'Property App').trim();
    const subject = `SMTP test — ${appName}`;
    const html = `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="margin:0 0 12px;">SMTP test</h2>
            <p>If you received this message, <strong>${appName}</strong> can send email through your configured SMTP server.</p>
            <p style="color:#666;font-size:14px;">Sent at ${new Date().toISOString()}</p>
        </div>
    `;

    try {
        await sendEmail({ email: to, subject, message: html });
    } catch (err) {
        console.error('Email test send failed:', err);
        return res.status(502).json({
            success: false,
            message: err.message || 'Failed to send test email.',
            data: summary
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Test email sent.',
        data: {
            to,
            from: summary.from,
            host: summary.host,
            port: summary.port
        }
    });
}

module.exports = { emailStatus, sendTest };
