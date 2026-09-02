const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./UserModel');

const ListingPreference = sequelize.define(
    'ListingPreference',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        role: {
            type: DataTypes.ENUM('broker', 'owner', 'host'),
            allowNull: false
        },
        listing_kind: {
            type: DataTypes.ENUM('licensed', 'marketing', 'dailyMonthly'),
            allowNull: false
        }
    },
    {
        tableName: 'listing_preferences',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

ListingPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(ListingPreference, { foreignKey: 'user_id', as: 'listingPreference' });

module.exports = ListingPreference;
