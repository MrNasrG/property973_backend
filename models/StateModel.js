const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Country = require('./CountryModel');

const State = sequelize.define(
    'State',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'countries', key: 'id' }
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    },
    {
        tableName: 'states',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

State.belongsTo(Country, { foreignKey: 'country_id', as: 'country' });
Country.hasMany(State, { foreignKey: 'country_id', as: 'states' });

module.exports = State;
