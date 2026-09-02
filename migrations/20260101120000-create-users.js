'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      mobile_number: {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true,
      },
      mobile_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      refresh_token_jti: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      refresh_token_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      passwordResetToken: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      passwordResetExpires: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.dropTable('users');
  },
};
