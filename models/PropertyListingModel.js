const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./UserModel');

const PropertyListing = sequelize.define(
    'PropertyListing',
    {
        id: {
            type: DataTypes.STRING(36),
            primaryKey: true
        },
        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        listing_kind: {
            type: DataTypes.ENUM('licensed', 'marketing'),
            allowNull: false
        },
        purpose: {
            type: DataTypes.ENUM('rent', 'sale'),
            allowNull: false
        },
        property_type: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        city: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        district: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        address: {
            type: DataTypes.STRING(512),
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(14, 2),
            allowNull: false
        },
        premium_period: {
            type: DataTypes.ENUM('yearly', 'semi_annual', 'quarterly', 'monthly'),
            allowNull: true
        },
        area: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        bedrooms: {
            type: DataTypes.STRING(8),
            allowNull: true
        },
        living_rooms: {
            type: DataTypes.STRING(8),
            allowNull: true
        },
        wc: {
            type: DataTypes.STRING(8),
            allowNull: true
        },
        floor: {
            type: DataTypes.STRING(16),
            allowNull: true
        },
        age_less_than: {
            type: DataTypes.STRING(16),
            allowNull: true
        },
        occupant_type: {
            type: DataTypes.ENUM('single', 'family'),
            allowNull: true
        },
        street_width: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        street_direction: {
            type: DataTypes.STRING(32),
            allowNull: true
        },
        furnished: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        car_entrance: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        air_conditioned: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        private_roof: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        in_villa: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        two_entrances: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        special_entrance: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        contact_phone: {
            type: DataTypes.STRING(32),
            allowNull: false
        },
        allow_inquiries: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        aqar_partners_assistance: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        status: {
            type: DataTypes.ENUM('draft', 'active', 'inactive', 'deleted'),
            allowNull: false,
            defaultValue: 'active'
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'property_listings',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: false
    }
);

PropertyListing.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(PropertyListing, { foreignKey: 'owner_id', as: 'propertyListings' });

module.exports = PropertyListing;
