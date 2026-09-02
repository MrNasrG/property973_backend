'use strict';

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} table
 */
async function tableExists(queryInterface, table) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) => String(t).toLowerCase());
    return normalized.includes(table.toLowerCase());
}

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} table
 * @param {string} column
 */
async function columnExists(queryInterface, table, column) {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
    tableExists,
    columnExists
};
