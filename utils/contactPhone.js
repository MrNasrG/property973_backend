const { normalizeMobile, isValidE164ish } = require('./mobile');

/**
 * GCC/MENA dial codes with expected national number lengths (after country code).
 * Bahrain (+973) is the default market.
 */
const DIAL_CODE_RULES = Object.freeze([
    { code: '973', min: 8, max: 8, label: 'Bahrain' },
    { code: '966', min: 9, max: 9, label: 'Saudi Arabia' },
    { code: '971', min: 9, max: 9, label: 'UAE' },
    { code: '965', min: 8, max: 8, label: 'Kuwait' },
    { code: '974', min: 8, max: 8, label: 'Qatar' },
    { code: '968', min: 8, max: 8, label: 'Oman' },
    { code: '962', min: 9, max: 9, label: 'Jordan' },
    { code: '961', min: 7, max: 8, label: 'Lebanon' },
    { code: '20', min: 10, max: 10, label: 'Egypt' },
    { code: '1', min: 10, max: 10, label: 'US/Canada' },
    { code: '44', min: 10, max: 10, label: 'UK' },
    { code: '91', min: 10, max: 10, label: 'India' }
]);

function matchDialRule(digitsAfterPlus) {
    const sorted = [...DIAL_CODE_RULES].sort((a, b) => b.code.length - a.code.length);
    for (const rule of sorted) {
        if (digitsAfterPlus.startsWith(rule.code)) {
            const national = digitsAfterPlus.slice(rule.code.length);
            if (national.length >= rule.min && national.length <= rule.max && /^\d+$/.test(national)) {
                return { valid: true, normalized: `+${digitsAfterPlus}`, rule };
            }
            return {
                valid: false,
                message: `Invalid phone number for ${rule.label} (+${rule.code}). Expected ${rule.min}${rule.min !== rule.max ? `–${rule.max}` : ''} digits after country code.`
            };
        }
    }
    return null;
}

/**
 * @param {string | undefined} phone
 * @returns {{ valid: boolean, normalized?: string, message?: string }}
 */
function validateContactPhone(phone) {
    const normalized = normalizeMobile(phone);
    if (!normalized) {
        return { valid: false, message: 'Contact phone is required' };
    }
    if (!isValidE164ish(normalized)) {
        return { valid: false, message: 'Contact phone must be in E.164 format (e.g. +97312345678)' };
    }

    const digits = normalized.slice(1);
    const matched = matchDialRule(digits);
    if (matched) {
        return matched.valid
            ? { valid: true, normalized: matched.normalized }
            : { valid: false, message: matched.message };
    }

    if (/^\+[1-9]\d{7,18}$/.test(normalized)) {
        return { valid: true, normalized };
    }

    return { valid: false, message: 'Unsupported or invalid contact phone number' };
}

module.exports = {
    DIAL_CODE_RULES,
    validateContactPhone
};
