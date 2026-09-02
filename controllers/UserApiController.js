const { UniqueConstraintError, ValidationError } = require('sequelize');
const User = require('../models/UserModel');
const { normalizeMobile, isValidE164ish } = require('../utils/mobile');

function emptyToNull(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

function parsePositiveInt(value, fallback) {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return n;
}

const listUsers = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
        const offset = (page - 1) * limit;

        const { count, rows } = await User.findAndCountAll({
            order: [['id', 'DESC']],
            limit,
            offset,
            attributes: {
                exclude: [
                    'password',
                    'passwordResetToken',
                    'passwordResetExpires',
                    'refresh_token_jti',
                    'refresh_token_expires'
                ]
            }
        });

        const users = rows.map((u) => ({
            id: u.id,
            fullName: u.name,
            email: u.email,
            mobileNumber: u.mobile_number,
            mobileVerified: u.mobile_verified,
            createdAt: u.created_at,
            updatedAt: u.updated_at
        }));

        return res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit) || 0
                }
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load users.' });
    }
};

const updateUser = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    if (req.authUserId !== id) {
        return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
    }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const body = req.body || {};
        const name =
            body.fullName !== undefined ? String(body.fullName || '').trim() : user.name;
        const email =
            body.email !== undefined ? emptyToNull(body.email) : user.email;
        let mobile_number = user.mobile_number;
        if (body.mobileNumber !== undefined) {
            const mobile = normalizeMobile(body.mobileNumber);
            if (mobile && !isValidE164ish(mobile)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid mobileNumber is required (E.164, e.g. +966512345678).'
                });
            }
            mobile_number = mobile || null;
        }
        const mobile_verified =
            body.mobileVerified !== undefined ? Boolean(body.mobileVerified) : user.mobile_verified;
        const password = body.password;

        if (!name) {
            return res.status(400).json({ success: false, message: 'fullName cannot be empty.' });
        }

        const payload = { name, email, mobile_number, mobile_verified };
        if (password != null && String(password).trim()) {
            payload.password = String(password);
        }

        await user.update(payload);

        await user.reload({
            attributes: ['id', 'name', 'email', 'mobile_number', 'mobile_verified', 'created_at', 'updated_at']
        });

        return res.status(200).json({
            success: true,
            message: 'User updated.',
            data: {
                user: {
                    id: user.id,
                    fullName: user.name,
                    email: user.email,
                    mobileNumber: user.mobile_number,
                    mobileVerified: user.mobile_verified,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                }
            }
        });
    } catch (err) {
        console.error(err);
        if (err instanceof UniqueConstraintError) {
            return res.status(409).json({
                success: false,
                message: 'Email or mobile number is already in use.'
            });
        }
        if (err instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: err.errors.map((e) => e.message).join(' ') || 'Validation failed.'
            });
        }
        return res.status(500).json({ success: false, message: 'Could not update user.' });
    }
};

module.exports = {
    listUsers,
    updateUser
};
