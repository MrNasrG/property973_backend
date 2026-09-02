'use strict';

const {
    seedAllLocations,
    truncateLocationTables,
    FULL_DATASET_MIN_COUNTRIES
} = require('./lib/loadLocationData');

/** @param {import('sequelize').QueryInterface} queryInterface */

module.exports = {
    async up(queryInterface) {
        const [rows] = await queryInterface.sequelize.query(
            'SELECT COUNT(*) AS cnt FROM countries LIMIT 1'
        );
        const cnt = rows && rows[0] ? Number(rows[0].cnt) : 0;

        if (cnt >= FULL_DATASET_MIN_COUNTRIES) {
            console.log(
                `Location data already seeded (${cnt} countries). Skipping. Run db:seed:undo for this seeder to re-import.`
            );
            return;
        }

        if (cnt > 0) {
            console.log('Replacing partial location data with full dataset...');
            await truncateLocationTables(queryInterface);
        }

        await seedAllLocations(queryInterface);
    },

    async down(queryInterface) {
        await truncateLocationTables(queryInterface);
    }
};
