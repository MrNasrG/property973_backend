'use strict';

const bcrypt = require('bcryptjs');

/**
 * Default admin for local/dev login (same rounds as UserModel beforeSave hook).
 * Change email/password in this file before running in production.
 */
const ADMIN_NAME = 'Administrator';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PLAIN_PASSWORD = 'Admin@123';

/** @param {import('sequelize').QueryInterface} queryInterface */

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      { replacements: [ADMIN_EMAIL] }
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return;
    }

    const password = await bcrypt.hash(ADMIN_PLAIN_PASSWORD, 12);
    const now = new Date();

    await queryInterface.bulkInsert(
      'users',
      [
        {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          password,
          passwordResetToken: null,
          passwordResetExpires: null,
          created_at: now,
          updated_at: now,
        },
      ],
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: ADMIN_EMAIL }, {});
  },
};
