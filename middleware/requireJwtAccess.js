const jwt = require('jsonwebtoken');
const { accessSecret, parseBearer } = require('../utils/authTokens');

/**
 * @returns {{ ok: true, userId: number } | { ok: false, message: string }}
 */
function verifyAccessToken(authorizationHeader) {
    const token = parseBearer(authorizationHeader);
    if (!token) {
        return { ok: false, message: 'Authorization token missing.' };
    }
    let decoded;
    try {
        decoded = jwt.verify(token, accessSecret());
    } catch (e) {
        return { ok: false, message: 'Invalid or expired token.' };
    }
    if (decoded.typ !== 'access' || !decoded.sub) {
        return { ok: false, message: 'Invalid or expired token.' };
    }
    const id = Number(decoded.sub);
    if (!Number.isFinite(id)) {
        return { ok: false, message: 'Invalid or expired token.' };
    }
    return { ok: true, userId: id };
}

/**
 * Express middleware: verify JWT access token and attach req.authUserId (number).
 */
function requireJwtAccess(req, res, next) {
    const result = verifyAccessToken(req.headers.authorization);
    if (!result.ok) {
        return res.status(401).json({ success: false, message: result.message });
    }
    req.authUserId = result.userId;
    return next();
}

/**
 * Optional JWT: attach req.authUserId when a valid Bearer token is present.
 * Missing token continues unauthenticated; invalid token returns 401.
 */
function optionalJwtAccess(req, res, next) {
    const token = parseBearer(req.headers.authorization);
    if (!token) {
        return next();
    }
    const result = verifyAccessToken(req.headers.authorization);
    if (!result.ok) {
        return res.status(401).json({ success: false, message: result.message });
    }
    req.authUserId = result.userId;
    return next();
}

module.exports = { requireJwtAccess, optionalJwtAccess };
