const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const PropertyListing = require('./PropertyListingModel');

const PropertyListingPhoto = sequelize.define(
    'PropertyListingPhoto',
    {
        id: {
            type: DataTypes.STRING(36),
            primaryKey: true
        },
        listing_id: {
            type: DataTypes.STRING(36),
            allowNull: false
        },
        url: {
            type: DataTypes.STRING(1024),
            allowNull: false
        },
        storage_path: {
            type: DataTypes.STRING(1024),
            allowNull: false
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'property_listing_photos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    }
);

PropertyListingPhoto.belongsTo(PropertyListing, { foreignKey: 'listing_id', as: 'listing' });
PropertyListing.hasMany(PropertyListingPhoto, {
    foreignKey: 'listing_id',
    as: 'photos'
});

module.exports = PropertyListingPhoto;
