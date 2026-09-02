'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('favourites', {
            id: {
                type: Sequelize.STRING(36),
                primaryKey: true,
                allowNull: false
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            listing_id: {
                type: Sequelize.STRING(36),
                allowNull: false,
                references: {
                    model: 'property_listings',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('favourites', ['user_id', 'listing_id'], {
            unique: true,
            name: 'favourites_user_id_listing_id_unique'
        });
        await queryInterface.addIndex('favourites', ['user_id'], {
            name: 'favourites_user_id_idx'
        });
        await queryInterface.addIndex('favourites', ['listing_id'], {
            name: 'favourites_listing_id_idx'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('favourites');
    }
};
