'use strict';

const { Country, State, City } = require('country-state-city');

const BATCH_SIZE = 1000;

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} table
 * @param {object[]} rows
 * @param {import('sequelize').Transaction} transaction
 */
async function bulkInsertBatched(queryInterface, table, rows, transaction) {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        if (chunk.length === 0) continue;
        await queryInterface.bulkInsert(table, chunk, { transaction });
    }
}

/**
 * Load full country / state / city dataset from country-state-city into MySQL.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 */
async function seedAllLocations(queryInterface) {
    const now = new Date();
    const countriesRaw = Country.getAllCountries();
    const statesRaw = State.getAllStates();
    const citiesRaw = City.getAllCities();

    console.log(
        `Seeding ${countriesRaw.length} countries, ${statesRaw.length} states, ${citiesRaw.length} cities...`
    );

    await queryInterface.sequelize.transaction(async (transaction) => {
        const countryRows = countriesRaw.map((c) => ({
            iso2: c.isoCode,
            name: c.name,
            created_at: now,
            updated_at: now
        }));
        await bulkInsertBatched(queryInterface, 'countries', countryRows, transaction);

        const [dbCountries] = await queryInterface.sequelize.query(
            'SELECT id, iso2 FROM countries',
            { transaction }
        );
        const countryIdByIso = new Map(dbCountries.map((r) => [r.iso2, r.id]));

        const stateRows = [];
        const stateKeys = [];

        for (const s of statesRaw) {
            const country_id = countryIdByIso.get(s.countryCode);
            if (!country_id) continue;
            stateKeys.push(`${s.countryCode}|${s.isoCode}`);
            stateRows.push({
                country_id,
                name: s.name,
                created_at: now,
                updated_at: now
            });
        }

        await bulkInsertBatched(queryInterface, 'states', stateRows, transaction);

        const [dbStates] = await queryInterface.sequelize.query(
            'SELECT id FROM states ORDER BY id ASC',
            { transaction }
        );

        if (dbStates.length !== stateKeys.length) {
            throw new Error(
                `State row count mismatch (inserted ${stateKeys.length}, found ${dbStates.length}).`
            );
        }

        const stateIdByKey = new Map();
        for (let i = 0; i < stateKeys.length; i++) {
            stateIdByKey.set(stateKeys[i], dbStates[i].id);
        }

        const cityRows = [];
        for (const city of citiesRaw) {
            const state_id = stateIdByKey.get(`${city.countryCode}|${city.stateCode}`);
            if (!state_id) continue;
            cityRows.push({
                state_id,
                name: city.name,
                created_at: now,
                updated_at: now
            });
        }

        console.log(`Inserting ${cityRows.length} cities in batches of ${BATCH_SIZE}...`);
        await bulkInsertBatched(queryInterface, 'cities', cityRows, transaction);
    });

    console.log('Location seed completed.');
}

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
async function truncateLocationTables(queryInterface) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryInterface.sequelize.query('TRUNCATE TABLE cities');
    await queryInterface.sequelize.query('TRUNCATE TABLE states');
    await queryInterface.sequelize.query('TRUNCATE TABLE countries');
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

module.exports = {
    seedAllLocations,
    truncateLocationTables,
    FULL_DATASET_MIN_COUNTRIES: 200
};
