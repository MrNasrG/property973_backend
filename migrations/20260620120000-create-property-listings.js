'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize')} Sequelize */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('property_listings', {
            id: {
                type: Sequelize.STRING(36),
                primaryKey: true,
                allowNull: false
            },
            owner_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            listing_kind: {
                type: Sequelize.ENUM('licensed', 'marketing'),
                allowNull: false
            },
            purpose: {
                type: Sequelize.ENUM('rent', 'sale'),
                allowNull: false
            },
            property_type: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            city: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            district: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            address: {
                type: Sequelize.STRING(512),
                allowNull: true
            },
            price: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false
            },
            premium_period: {
                type: Sequelize.ENUM('yearly', 'semi_annual', 'quarterly', 'monthly'),
                allowNull: true
            },
            area: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            bedrooms: {
                type: Sequelize.STRING(8),
                allowNull: true
            },
            living_rooms: {
                type: Sequelize.STRING(8),
                allowNull: true
            },
            wc: {
                type: Sequelize.STRING(8),
                allowNull: true
            },
            floor: {
                type: Sequelize.STRING(16),
                allowNull: true
            },
            age_less_than: {
                type: Sequelize.STRING(16),
                allowNull: true
            },
            occupant_type: {
                type: Sequelize.ENUM('single', 'family'),
                allowNull: true
            },
            street_width: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            street_direction: {
                type: Sequelize.STRING(32),
                allowNull: true
            },
            furnished: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            car_entrance: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            air_conditioned: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            private_roof: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            in_villa: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            two_entrances: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            special_entrance: {
                type: Sequelize.BOOLEAN,
                allowNull: true
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            contact_phone: {
                type: Sequelize.STRING(32),
                allowNull: false
            },
            allow_inquiries: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            aqar_partners_assistance: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            status: {
                type: Sequelize.ENUM('draft', 'active', 'inactive', 'deleted'),
                allowNull: false,
                defaultValue: 'active'
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
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        await queryInterface.addIndex('property_listings', ['owner_id']);
        await queryInterface.addIndex('property_listings', ['status']);
        await queryInterface.addIndex('property_listings', ['deleted_at']);
        await queryInterface.addIndex('property_listings', ['purpose']);

        await queryInterface.createTable('property_listing_photos', {
            id: {
                type: Sequelize.STRING(36),
                primaryKey: true,
                allowNull: false
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
            url: {
                type: Sequelize.STRING(1024),
                allowNull: false
            },
            storage_path: {
                type: Sequelize.STRING(1024),
                allowNull: false
            },
            sort_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('property_listing_photos', ['listing_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('property_listing_photos');
        await queryInterface.dropTable('property_listings');
    }
};
