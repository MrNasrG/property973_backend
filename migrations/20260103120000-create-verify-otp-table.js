'use strict';

const { tableExists } = require('./lib/migrationHelpers');

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'verify_otp')) {
      return;
    }

    await queryInterface.createTable('verify_otp', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mobile_number: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      otp_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('verify_otp', ['mobile_number'], {
      name: 'verify_otp_mobile_number_idx',
    });
    await queryInterface.addIndex('verify_otp', ['user_id'], {
      name: 'verify_otp_user_id_idx',
    });
    await queryInterface.addIndex('verify_otp', ['expires_at'], {
      name: 'verify_otp_expires_at_idx',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'verify_otp')) {
      await queryInterface.dropTable('verify_otp');
    }
  },
};
