const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Country = sequelize.define(
    'Country',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        iso2: {
            type: DataTypes.STRING(2),
            allowNull: true,
            unique: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    },
    {
        tableName: 'countries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

module.exports = Country;
