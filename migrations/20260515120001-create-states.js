'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('states', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      country_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'countries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('states', ['country_id'], { name: 'states_country_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('states');
  },
};
