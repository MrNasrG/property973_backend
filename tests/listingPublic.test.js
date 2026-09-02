const { buildPublicListWhere, buildSortOrder } = require('../controllers/ListingController');
const { Op } = require('sequelize');
const { PURPOSES, CITIES, PROPERTY_TYPES } = require('../utils/listingValidation');

describe('buildPublicListWhere', () => {
    test('defaults to active non-deleted listings only', () => {
        const { where } = buildPublicListWhere({});
        expect(where.status).toBe('active');
        expect(where.deleted_at).toBeNull();
        expect(where.owner_id).toBeUndefined();
        expect(where.purpose).toBeUndefined();
        expect(where.city).toBeUndefined();
        expect(where.property_type).toBeUndefined();
    });

    test('accepts valid filters', () => {
        const { where } = buildPublicListWhere({
            purpose: 'rent',
            city: 'Juffair',
            propertyType: 'Apartment'
        });
        expect(where.purpose).toBe('rent');
        expect(where.city).toBe('Juffair');
        expect(where.property_type).toBe('Apartment');
    });

    test('ignores all purpose and property type filters', () => {
        const { where } = buildPublicListWhere({
            purpose: 'all',
            propertyType: 'all',
            city: 'all'
        });
        expect(where.purpose).toBeUndefined();
        expect(where.city).toBeUndefined();
        expect(where.property_type).toBeUndefined();
    });

    test('accepts homepage default payload (All + All Type)', () => {
        const result = buildPublicListWhere({
            page: '1',
            limit: '12',
            sort: '-createdAt',
            purpose: 'all',
            propertyType: 'All Type'
        });
        expect(result.error).toBeUndefined();
        expect(result.where.purpose).toBeUndefined();
        expect(result.where.property_type).toBeUndefined();
    });

    test('accepts All Types label for property type filter', () => {
        const result = buildPublicListWhere({ propertyType: 'All Types' });
        expect(result.error).toBeUndefined();
        expect(result.where.property_type).toBeUndefined();
    });

    test('maps homepage property type chips to stored values', () => {
        const { where } = buildPublicListWhere({ propertyType: 'apartments' });
        expect(where.property_type).toEqual({ [Op.in]: ['Apartment', 'Big flat'] });
    });

    test('maps commercial offices filter', () => {
        const { where } = buildPublicListWhere({ propertyType: 'Commercial Offices' });
        expect(where.property_type).toBe('Office');
    });

    test('filters by sale purpose only', () => {
        const { where } = buildPublicListWhere({ purpose: 'sale' });
        expect(where.purpose).toBe('sale');
    });

    test('accepts case-insensitive city names', () => {
        const { where } = buildPublicListWhere({ city: 'seef' });
        expect(where.city).toBe('Seef');
    });

    test('rejects invalid purpose', () => {
        const result = buildPublicListWhere({ purpose: 'lease' });
        expect(result.error).toEqual({
            field: 'purpose',
            message: 'Invalid purpose filter'
        });
    });

    test('treats rent & sale label as show all purposes', () => {
        const result = buildPublicListWhere({ purpose: 'Rent & Sale' });
        expect(result.error).toBeUndefined();
        expect(result.where.purpose).toBeUndefined();
    });

    test('rejects invalid city', () => {
        const result = buildPublicListWhere({ city: 'Manama' });
        expect(result.error).toEqual({ field: 'city', message: 'Invalid city filter' });
    });

    test('rejects invalid property type', () => {
        const result = buildPublicListWhere({ propertyType: 'Castle' });
        expect(result.error).toEqual({ field: 'propertyType', message: 'Invalid property type filter' });
    });
});

describe('buildSortOrder', () => {
    test('defaults to newest first', () => {
        expect(buildSortOrder()).toEqual([['created_at', 'DESC']]);
    });

    test('supports price ascending', () => {
        expect(buildSortOrder('price')).toEqual([['price', 'ASC']]);
    });
});

describe('public listing enums', () => {
    test('purpose and city enums are non-empty', () => {
        expect(PURPOSES).toContain('rent');
        expect(CITIES).toContain('Seef');
        expect(PROPERTY_TYPES).toContain('Villa');
    });
});
