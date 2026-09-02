'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('countries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      iso2: {
        type: Sequelize.STRING(2),
        allowNull: true,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('countries');
  },
};
