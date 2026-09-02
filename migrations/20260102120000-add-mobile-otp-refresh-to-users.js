'use strict';

const { columnExists } = require('./lib/migrationHelpers');

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'users';

    await queryInterface.changeColumn(table, 'email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });

    if (!(await columnExists(queryInterface, table, 'mobile_number'))) {
      await queryInterface.addColumn(table, 'mobile_number', {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true,
      });
    }

    if (!(await columnExists(queryInterface, table, 'otp_hash'))) {
      await queryInterface.addColumn(table, 'otp_hash', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, table, 'otp_expires_at'))) {
      await queryInterface.addColumn(table, 'otp_expires_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, table, 'mobile_verified'))) {
      await queryInterface.addColumn(table, 'mobile_verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!(await columnExists(queryInterface, table, 'refresh_token_jti'))) {
      await queryInterface.addColumn(table, 'refresh_token_jti', {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, table, 'refresh_token_expires'))) {
      await queryInterface.addColumn(table, 'refresh_token_expires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'users';

    if (await columnExists(queryInterface, table, 'refresh_token_expires')) {
      await queryInterface.removeColumn(table, 'refresh_token_expires');
    }
    if (await columnExists(queryInterface, table, 'refresh_token_jti')) {
      await queryInterface.removeColumn(table, 'refresh_token_jti');
    }
    if (await columnExists(queryInterface, table, 'mobile_verified')) {
      await queryInterface.removeColumn(table, 'mobile_verified');
    }
    if (await columnExists(queryInterface, table, 'otp_expires_at')) {
      await queryInterface.removeColumn(table, 'otp_expires_at');
    }
    if (await columnExists(queryInterface, table, 'otp_hash')) {
      await queryInterface.removeColumn(table, 'otp_hash');
    }
    if (await columnExists(queryInterface, table, 'mobile_number')) {
      await queryInterface.removeColumn(table, 'mobile_number');
    }

    await queryInterface.changeColumn(table, 'email', {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    });
  },
};
