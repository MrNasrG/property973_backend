const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
            isValidEmailIfPresent(value) {
                if (!value || value === '') return;
                if (!validator.isEmail(value)) {
                    throw new Error('Invalid email.');
                }
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mobile_number: {
        type: DataTypes.STRING(32),
        allowNull: true,
        unique: true,
        validate: {
            isE164Like(value) {
                if (!value || value === '') return;
                if (!/^\+[1-9]\d{7,18}$/.test(value.replace(/\s/g, ''))) {
                    throw new Error('Invalid mobile number.');
                }
            }
        }
    },
    mobile_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    refresh_token_jti: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    refresh_token_expires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 12);
            }
        }
    }
});

User.prototype.createPasswordResetToken = function () {
    let resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = resetToken;
    resetToken = resetToken + '|' + this.id;
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    const bufferObj = Buffer.from(resetToken, 'utf8');
    resetToken = bufferObj.toString('base64');
    return resetToken;
};

module.exports = User;
