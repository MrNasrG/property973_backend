const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const accessSecret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || 'nodedemo123';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || accessSecret();

/**
 * @param {import('../models/UserModel')} user
 */
function signAccessToken(user) {
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    return jwt.sign(
        {
            typ: 'access',
            name: user.name,
            mobile: user.mobile_number
        },
        accessSecret(),
        { subject: String(user.id), expiresIn }
    );
}

function signRefreshToken(userId) {
    const jti = crypto.randomBytes(16).toString('hex');
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const token = jwt.sign(
        { typ: 'refresh' },
        refreshSecret(),
        { subject: String(userId), jwtid: jti, expiresIn }
    );
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;
    return { token, jti, expiresAt };
}

/**
 * @param {string | undefined} bearerOrToken
 */
function parseBearer(bearerOrToken) {
    if (!bearerOrToken) return null;
    const s = bearerOrToken.trim();
    if (s.toLowerCase().startsWith('bearer ')) return s.slice(7).trim();
    return s || null;
}

module.exports = {
    accessSecret,
    refreshSecret,
    signAccessToken,
    signRefreshToken,
    parseBearer
};
