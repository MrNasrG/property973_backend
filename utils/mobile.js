/**
 * @param {string | undefined} mobile
 * @returns {string}
 */
function normalizeMobile(mobile) {
    const raw = String(mobile || '').trim();
    if (!raw) return '';
    const digits = raw.replace(/\s/g, '');
    if (digits.startsWith('+')) return digits;
    return `+${digits}`;
}

/**
 * @param {string} mobile
 * @returns {boolean}
 */
function isValidE164ish(mobile) {
    if (!mobile || mobile.length < 10 || mobile.length > 20) return false;
    return /^\+[1-9]\d{7,18}$/.test(mobile);
}

module.exports = { normalizeMobile, isValidE164ish };
