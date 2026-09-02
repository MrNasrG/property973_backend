const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./UserModel');
const PropertyListing = require('./PropertyListingModel');

const Favourite = sequelize.define(
    'Favourite',
    {
        id: {
            type: DataTypes.STRING(36),
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        listing_id: {
            type: DataTypes.STRING(36),
            allowNull: false
        }
    },
    {
        tableName: 'favourites',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'listing_id'],
                name: 'favourites_user_id_listing_id_unique'
            }
        ]
    }
);

Favourite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Favourite.belongsTo(PropertyListing, { foreignKey: 'listing_id', as: 'listing' });
User.hasMany(Favourite, { foreignKey: 'user_id', as: 'favourites' });
PropertyListing.hasMany(Favourite, { foreignKey: 'listing_id', as: 'favourites' });

module.exports = Favourite;
