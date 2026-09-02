const fs = require('fs');
const path = require('path');

const BRAND = {
    primary: '#B01E23',
    primaryDark: '#8A171C',
    palePink: '#FDF2F2',
    palePinkBorder: '#F5D0D2',
    accentBlue: '#2161D1',
    text: '#333333',
    textMuted: '#666666',
    white: '#FFFFFF',
    footerBg: '#F8F8F8'
};

const LOGO_CID = 'property973-logo@brand';
const LOGO_FILE = path.join(__dirname, '..', 'public', 'images', 'property973-logo.png');

function appName() {
    return (process.env.APP_NAME || 'Property 973').trim() || 'Property 973';
}

function appPublicUrl() {
    return (process.env.APP_PUBLIC_URL || '').trim().replace(/\/$/, '');
}

function appApiPublicUrl() {
    const api = (process.env.APP_API_PUBLIC_URL || '').trim().replace(/\/$/, '');
    return api || appPublicUrl();
}

function otpExpiresMinutes() {
    const minutes = parseInt(String(process.env.OTP_EXPIRES_MINUTES || '10'), 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 10;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function brandLogoUrl() {
    const custom = (process.env.BRAND_LOGO_URL || '').trim();
    if (custom) return custom;
    const base = appPublicUrl();
    if (base) return `${base}/property973-logo.png`;
    const apiBase = appApiPublicUrl();
    if (apiBase) return `${apiBase}/images/property973-logo.png`;
    return null;
}

function brandLogoSrc() {
    if (fs.existsSync(LOGO_FILE)) return `cid:${LOGO_CID}`;
    return brandLogoUrl();
}

function brandLogoHtml() {
    const src = brandLogoSrc();
    const name = escapeHtml(appName());

    if (src) {
        return `
            <img
                src="${escapeHtml(src)}"
                alt="${name}"
                width="220"
                style="display:block;margin:0 auto;max-width:220px;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
            />
        `;
    }

    return `
        <span style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:0.5px;color:${BRAND.primary};">
            ${escapeHtml(appName().toUpperCase())}
        </span>
    `;
}

function getBrandLogoAttachment() {
    if (!fs.existsSync(LOGO_FILE)) return null;
    return {
        filename: 'property973-logo.png',
        path: LOGO_FILE,
        cid: LOGO_CID
    };
}

/**
 * @param {{ title: string, bodyHtml: string, preheader?: string }} opts
 */
function buildEmailLayout({ title, bodyHtml, preheader }) {
    const siteUrl = appPublicUrl();
    const footerLink = siteUrl
        ? `<a href="${escapeHtml(siteUrl)}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>`
        : escapeHtml(appName());

    const preheaderBlock = preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`
        : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${preheaderBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(176,30,35,0.12);">
                    <tr>
                        <td style="height:6px;background-color:${BRAND.primary};font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding:32px 32px 24px;text-align:center;background-color:${BRAND.white};">
                            ${brandLogoHtml()}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 32px;color:${BRAND.text};font-size:16px;line-height:1.6;">
                            ${bodyHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;background-color:${BRAND.palePink};border-top:1px solid ${BRAND.palePinkBorder};text-align:center;font-size:13px;line-height:1.5;color:${BRAND.textMuted};">
                            <p style="margin:0 0 6px;font-weight:600;color:${BRAND.primary};">${escapeHtml(appName())}</p>
                            <p style="margin:0 0 8px;">&copy; ${new Date().getFullYear()} ${escapeHtml(appName())}. All rights reserved.</p>
                            <p style="margin:0;">${footerLink}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

function primaryButtonHtml(href, label) {
    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
            <tr>
                <td align="center" style="border-radius:6px;background-color:${BRAND.primary};">
                    <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:${BRAND.white};text-decoration:none;border-radius:6px;background-color:${BRAND.primary};">${escapeHtml(label)}</a>
                </td>
            </tr>
        </table>
    `;
}

function buildOtpCopyUrl(otp) {
    const base = appApiPublicUrl();
    if (!base) return null;
    return `${base}/auth/otp/copy?code=${encodeURIComponent(otp)}`;
}

/**
 * @param {{ name?: string | null, otp: string, purpose?: string }} opts
 */
function buildOtpEmailHtml({ name, otp, purpose }) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
    const reason = escapeHtml(purpose || 'verify your account');
    const minutes = otpExpiresMinutes();
    const safeOtp = escapeHtml(otp);
    const copyUrl = buildOtpCopyUrl(otp);

    const copyButton = copyUrl
        ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;">
                <tr>
                    <td align="center" style="border-radius:6px;background-color:${BRAND.primary};">
                        <a href="${escapeHtml(copyUrl)}" target="_blank" style="display:inline-block;padding:10px 24px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.white};text-decoration:none;border-radius:6px;">Copy code</a>
                    </td>
                </tr>
            </table>
            <p style="margin:12px 0 0;font-size:13px;color:${BRAND.textMuted};text-align:center;">Tap <strong>Copy code</strong> to copy it to your clipboard.</p>
        `
        : '';

    const bodyHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
            <tr>
                <td align="center" style="background-color:${BRAND.primary};border-radius:8px;padding:14px 20px;">
                    <h1 style="margin:0;font-size:20px;font-weight:700;color:${BRAND.white};letter-spacing:0.3px;">Your verification code</h1>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 8px;font-size:16px;color:${BRAND.text};">${greeting}</p>
        <p style="margin:0 0 28px;color:${BRAND.textMuted};">Use the code below to <strong style="color:${BRAND.primary};">${reason}</strong>:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" style="background-color:${BRAND.palePink};border:2px dashed ${BRAND.primary};border-radius:10px;padding:28px 16px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${BRAND.textMuted};">One-time code</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:800;letter-spacing:12px;color:${BRAND.primary};user-select:all;-webkit-user-select:all;">${safeOtp}</p>
                </td>
            </tr>
        </table>
        ${copyButton}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
            <tr>
                <td style="background-color:${BRAND.footerBg};border-left:4px solid ${BRAND.primary};border-radius:4px;padding:14px 16px;font-size:14px;color:${BRAND.textMuted};">
                    This code expires in <strong style="color:${BRAND.primary};">${minutes} minutes</strong>. If you did not request this, you can safely ignore this email.
                </td>
            </tr>
        </table>
    `;

    return buildEmailLayout({
        title: 'Your verification code',
        preheader: `Your code is ${otp}. It expires in ${minutes} minutes.`,
        bodyHtml
    });
}

/**
 * @param {{ name?: string | null, otp: string, purpose?: string }} opts
 */
function buildOtpEmailText({ name, otp, purpose }) {
    const greeting = name ? `Hi ${name},` : 'Hi,';
    const reason = purpose || 'verify your account';
    const minutes = otpExpiresMinutes();
    const copyUrl = buildOtpCopyUrl(otp);
    const copyLine = copyUrl ? `\nCopy code: ${copyUrl}\n` : '';

    return `${greeting}

Use the code below to ${reason}:

${otp}
${copyLine}
This code expires in ${minutes} minutes. If you did not request this, you can safely ignore this email.

— ${appName()}`;
}

/**
 * @param {{ name?: string | null, resetUrl: string }} opts
 */
function buildPasswordResetEmailHtml({ name, resetUrl }) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
    const safeUrl = escapeHtml(resetUrl);

    const bodyHtml = `
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.text};text-align:center;">Reset your password</h1>
        <p style="margin:0 0 8px;">${greeting}</p>
        <p style="margin:0 0 8px;color:${BRAND.textMuted};">We received a request to reset your password. Click the button below to choose a new one:</p>
        ${primaryButtonHtml(resetUrl, 'Reset password')}
        <p style="margin:24px 0 0;font-size:14px;color:${BRAND.textMuted};">This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        <p style="margin:16px 0 0;font-size:12px;color:${BRAND.textMuted};word-break:break-all;">Or copy this link:<br><a href="${safeUrl}" style="color:${BRAND.primary};">${safeUrl}</a></p>
    `;

    return buildEmailLayout({
        title: 'Reset your password',
        preheader: 'Reset your password using the link in this email.',
        bodyHtml
    });
}

/**
 * @param {{ name?: string | null, resetUrl: string }} opts
 */
function buildPasswordResetEmailText({ name, resetUrl }) {
    const greeting = name ? `Hi ${name},` : 'Hi,';
    return `${greeting}

We received a request to reset your password.

Reset your password: ${resetUrl}

This link expires in 1 hour. If you did not request this, you can safely ignore this email.

— ${appName()}`;
}

/**
 * @param {{ name?: string | null }} opts
 */
function buildWelcomeEmailHtml({ name }) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
    const siteUrl = appPublicUrl();

    const exploreButton = siteUrl
        ? primaryButtonHtml(siteUrl, 'Explore properties')
        : '';

    const bodyHtml = `
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.text};text-align:center;">Welcome to ${escapeHtml(appName())}</h1>
        <p style="margin:0 0 8px;">${greeting}</p>
        <p style="margin:0 0 8px;color:${BRAND.textMuted};">Your account is ready. You can sign in anytime with your registered mobile number and password.</p>
        <p style="margin:0 0 8px;color:${BRAND.textMuted};">Discover premium properties across Bahrain — from luxury villas to smart investments.</p>
        ${exploreButton}
    `;

    return buildEmailLayout({
        title: `Welcome to ${appName()}`,
        preheader: `Welcome to ${appName()}! Your account is ready.`,
        bodyHtml
    });
}

/**
 * Minimal page opened from the OTP email "Copy code" button.
 * @param {string} code
 */
function buildOtpCopyPageHtml(code) {
    const safeCode = escapeHtml(code);
    const siteUrl = appPublicUrl();
    const homeHref = siteUrl ? escapeHtml(siteUrl) : '/';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Code copied — ${escapeHtml(appName())}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #F3F4F6;
            color: #333;
        }
        .card {
            width: 100%;
            max-width: 420px;
            background: #fff;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .brand {
            color: ${BRAND.primary};
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 20px;
        }
        .code {
            font-family: 'Courier New', Courier, monospace;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 8px;
            color: ${BRAND.primary};
            background: ${BRAND.palePink};
            border: 2px solid ${BRAND.primary};
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
            user-select: all;
        }
        .status {
            font-size: 15px;
            color: #666;
            margin: 12px 0 20px;
            min-height: 22px;
        }
        .status.ok { color: #1a7f37; font-weight: 600; }
        .status.err { color: #B01E23; }
        button, .btn {
            display: inline-block;
            padding: 12px 28px;
            font-size: 15px;
            font-weight: 600;
            color: #fff;
            background: ${BRAND.primary};
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
        }
        button:hover, .btn:hover { background: ${BRAND.primaryDark}; }
        .hint { font-size: 13px; color: #888; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand">${escapeHtml(appName())}</div>
        <h1 style="font-size:20px;margin:0 0 8px;">Verification code</h1>
        <div class="code" id="otp-code">${safeCode}</div>
        <p class="status" id="status">Copying code…</p>
        <button type="button" id="copy-btn">Copy again</button>
        <p class="hint">Return to the app and paste your code to continue.</p>
        <p style="margin-top:20px;"><a class="btn" href="${homeHref}">Go to website</a></p>
    </div>
    <script>
        (function () {
            var code = ${JSON.stringify(code)};
            var statusEl = document.getElementById('status');
            var copyBtn = document.getElementById('copy-btn');

            function setStatus(msg, cls) {
                statusEl.textContent = msg;
                statusEl.className = 'status' + (cls ? ' ' + cls : '');
            }

            function copyCode() {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    return navigator.clipboard.writeText(code).then(function () {
                        setStatus('Copied to clipboard!', 'ok');
                    }).catch(fallbackCopy);
                }
                return fallbackCopy();
            }

            function fallbackCopy() {
                var el = document.getElementById('otp-code');
                var range = document.createRange();
                range.selectNodeContents(el);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                try {
                    var ok = document.execCommand('copy');
                    sel.removeAllRanges();
                    if (ok) {
                        setStatus('Copied to clipboard!', 'ok');
                        return Promise.resolve();
                    }
                } catch (e) { /* ignore */ }
                sel.removeAllRanges();
                setStatus('Select the code above and copy manually (Ctrl+C / Cmd+C).', 'err');
                return Promise.resolve();
            }

            copyBtn.addEventListener('click', copyCode);
            copyCode();
        })();
    </script>
</body>
</html>
    `.trim();
}

module.exports = {
    LOGO_CID,
    getBrandLogoAttachment,
    buildOtpEmailHtml,
    buildOtpEmailText,
    buildPasswordResetEmailHtml,
    buildPasswordResetEmailText,
    buildWelcomeEmailHtml,
    buildOtpCopyPageHtml
};
