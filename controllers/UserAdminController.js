const { UniqueConstraintError, ValidationError } = require('sequelize');
const User = require('../models/UserModel');
const { sendWelcomeEmail } = require('../utils/email');

function emptyToNull(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

const index = async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['id', 'DESC']],
            attributes: {
                exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'refresh_token_jti', 'refresh_token_expires']
            }
        });
        return res.render('users/index', {
            title: 'Users',
            navActive: 'users',
            users
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Could not load users.');
        return res.redirect('/index');
    }
};

const newForm = (req, res) => {
    return res.render('users/form', {
        title: 'New user',
        navActive: 'users',
        user: null,
        formAction: '/database/users',
        formMethod: 'post'
    });
};

const create = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = emptyToNull(req.body.email);
        const password = req.body.password;
        const mobile_number = emptyToNull(req.body.mobile_number);
        const mobile_verified = req.body.mobile_verified === 'on' || req.body.mobile_verified === '1';

        if (!name) {
            req.flash('error', 'Name is required.');
            return res.redirect('/database/users/new');
        }
        if (!password || !String(password).trim()) {
            req.flash('error', 'Password is required.');
            return res.redirect('/database/users/new');
        }

        const user = await User.create({
            name,
            email,
            password: String(password),
            mobile_number,
            mobile_verified
        });
        if (user.email) {
            try {
                await sendWelcomeEmail(user.email, { name: user.name });
            } catch (emailErr) {
                console.error('Welcome email failed:', emailErr);
            }
        }
        req.flash('message', 'User created.');
        return res.redirect('/database/users');
    } catch (err) {
        console.error(err);
        if (err instanceof UniqueConstraintError) {
            req.flash('error', 'Email or mobile number is already in use.');
        } else if (err instanceof ValidationError) {
            req.flash('error', err.errors.map((e) => e.message).join(' ') || 'Validation failed.');
        } else {
            req.flash('error', 'Could not create user.');
        }
        return res.redirect('/database/users/new');
    }
};

const editForm = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        req.flash('error', 'Invalid user.');
        return res.redirect('/database/users');
    }
    try {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/database/users');
        }
        return res.render('users/form', {
            title: 'Edit user',
            navActive: 'users',
            user,
            formAction: `/database/users/${id}/update`,
            formMethod: 'post'
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Could not load user.');
        return res.redirect('/database/users');
    }
};

const update = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        req.flash('error', 'Invalid user.');
        return res.redirect('/database/users');
    }
    try {
        const user = await User.findByPk(id);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/database/users');
        }

        const name = String(req.body.name || '').trim();
        const email = emptyToNull(req.body.email);
        const mobile_number = emptyToNull(req.body.mobile_number);
        const mobile_verified = req.body.mobile_verified === 'on' || req.body.mobile_verified === '1';
        const password = req.body.password;

        if (!name) {
            req.flash('error', 'Name is required.');
            return res.redirect(`/database/users/${id}/edit`);
        }

        const payload = { name, email, mobile_number, mobile_verified };
        if (password && String(password).trim()) {
            payload.password = String(password);
        }

        await user.update(payload);
        req.flash('message', 'User updated.');
        return res.redirect('/database/users');
    } catch (err) {
        console.error(err);
        if (err instanceof UniqueConstraintError) {
            req.flash('error', 'Email or mobile number is already in use.');
        } else if (err instanceof ValidationError) {
            req.flash('error', err.errors.map((e) => e.message).join(' ') || 'Validation failed.');
        } else {
            req.flash('error', 'Could not update user.');
        }
        return res.redirect(`/database/users/${id}/edit`);
    }
};

const destroy = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        req.flash('error', 'Invalid user.');
        return res.redirect('/database/users');
    }
    if (req.session.userid === id) {
        req.flash('error', 'You cannot delete your own account while logged in.');
        return res.redirect('/database/users');
    }
    try {
        const user = await User.findByPk(id);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/database/users');
        }
        await user.destroy();
        req.flash('message', 'User deleted.');
        return res.redirect('/database/users');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Could not delete user.');
        return res.redirect('/database/users');
    }
};

module.exports = {
    index,
    newForm,
    create,
    editForm,
    update,
    destroy
};
