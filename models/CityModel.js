const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const State = require('./StateModel');

const City = sequelize.define(
    'City',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        state_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'states', key: 'id' }
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    },
    {
        tableName: 'cities',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

City.belongsTo(State, { foreignKey: 'state_id', as: 'state' });
State.hasMany(City, { foreignKey: 'state_id', as: 'cities' });

module.exports = City;
