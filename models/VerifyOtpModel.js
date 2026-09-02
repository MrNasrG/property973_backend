const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./UserModel');

const VerifyOtp = sequelize.define(
    'VerifyOtp',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' }
        },
        mobile_number: {
            type: DataTypes.STRING(32),
            allowNull: false
        },
        otp_hash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    },
    {
        tableName: 'verify_otp',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

VerifyOtp.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(VerifyOtp, { foreignKey: 'user_id', as: 'verifyOtps' });

module.exports = VerifyOtp;
