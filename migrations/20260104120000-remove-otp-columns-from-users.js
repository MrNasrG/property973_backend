'use strict';

const { columnExists } = require('./lib/migrationHelpers');

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
  async up(queryInterface) {
    const table = 'users';

    if (await columnExists(queryInterface, table, 'otp_expires_at')) {
      await queryInterface.removeColumn(table, 'otp_expires_at');
    }
    if (await columnExists(queryInterface, table, 'otp_hash')) {
      await queryInterface.removeColumn(table, 'otp_hash');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'users';

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
  },
};
