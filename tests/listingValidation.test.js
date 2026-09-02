const {
    getVisibleOwnerPropertyFields,
    getRequiredFields,
    validateListingPayload,
    canAccessListing
} = require('../utils/listingValidation');
const { validateContactPhone } = require('../utils/contactPhone');

describe('getVisibleOwnerPropertyFields', () => {
    test('rent apartment shows residential + premium + occupant + features', () => {
        const visible = getVisibleOwnerPropertyFields('rent', 'Apartment');
        expect(visible.has('bedrooms')).toBe(true);
        expect(visible.has('premiumPeriod')).toBe(true);
        expect(visible.has('occupantType')).toBe(true);
        expect(visible.has('furnished')).toBe(true);
        expect(visible.has('streetWidth')).toBe(false);
    });

    test('sale villa shows street fields without premium or occupant', () => {
        const visible = getVisibleOwnerPropertyFields('sale', 'Villa');
        expect(visible.has('streetWidth')).toBe(true);
        expect(visible.has('streetDirection')).toBe(true);
        expect(visible.has('premiumPeriod')).toBe(false);
        expect(visible.has('occupantType')).toBe(false);
    });

    test('land types only expose street fields', () => {
        const visible = getVisibleOwnerPropertyFields('sale', 'Land');
        expect(visible.has('streetWidth')).toBe(true);
        expect(visible.has('bedrooms')).toBe(false);
        expect(visible.has('floor')).toBe(false);
    });

    test('commercial rent exposes floor, age, entrances, premium', () => {
        const visible = getVisibleOwnerPropertyFields('rent', 'Office');
        expect(visible.has('floor')).toBe(true);
        expect(visible.has('ageLessThan')).toBe(true);
        expect(visible.has('carEntrance')).toBe(true);
        expect(visible.has('premiumPeriod')).toBe(true);
        expect(visible.has('furnished')).toBe(false);
    });

    test('other residential rent exposes bedrooms and premium without occupant', () => {
        const visible = getVisibleOwnerPropertyFields('rent', 'Room');
        expect(visible.has('bedrooms')).toBe(true);
        expect(visible.has('premiumPeriod')).toBe(true);
        expect(visible.has('occupantType')).toBe(false);
    });
});

describe('getRequiredFields', () => {
    test('rent apartment requires premium and residential counts', () => {
        const required = getRequiredFields('rent', 'Apartment');
        expect(required.has('premiumPeriod')).toBe(true);
        expect(required.has('bedrooms')).toBe(true);
        expect(required.has('occupantType')).toBe(true);
    });

    test('sale land requires street fields', () => {
        const required = getRequiredFields('sale', 'Land');
        expect(required.has('streetWidth')).toBe(true);
        expect(required.has('streetDirection')).toBe(true);
    });
});

describe('validateListingPayload', () => {
    const baseRentApartment = {
        listingKind: 'licensed',
        purpose: 'rent',
        propertyType: 'Apartment',
        city: 'Juffair',
        district: 'Block 123',
        price: 65000,
        area: 120,
        description: 'Spacious apartment in Juffair',
        contactPhone: '+97312345678',
        bedrooms: '3',
        livingRooms: '1',
        wc: '2',
        floor: 'Ground',
        ageLessThan: 'New',
        premiumPeriod: 'yearly',
        occupantType: 'family'
    };

    test('accepts valid rent apartment payload', () => {
        const { errors, data } = validateListingPayload(baseRentApartment);
        expect(errors).toHaveLength(0);
        expect(data.price).toBe(65000);
        expect(data.contactPhone).toBe('+97312345678');
    });

    test('rejects missing price', () => {
        const payload = { ...baseRentApartment };
        delete payload.price;
        const { errors } = validateListingPayload(payload);
        expect(errors.some((e) => e.field === 'price')).toBe(true);
    });

    test('rejects short description', () => {
        const { errors } = validateListingPayload({ ...baseRentApartment, description: 'short' });
        expect(errors.some((e) => e.field === 'description')).toBe(true);
    });

    test('nulls hidden fields for land listing', () => {
        const { errors, data } = validateListingPayload({
            listingKind: 'licensed',
            purpose: 'sale',
            propertyType: 'Land',
            city: 'Saar',
            district: 'Plot 9',
            price: 120000,
            area: 400,
            description: 'Large land plot in Saar area',
            contactPhone: '+97312345678',
            streetWidth: 12,
            streetDirection: 'North',
            bedrooms: '3'
        });
        expect(errors).toHaveLength(0);
        expect(data.bedrooms).toBeNull();
        expect(data.streetWidth).toBe(12);
    });

    test('rejects invalid city', () => {
        const { errors } = validateListingPayload({ ...baseRentApartment, city: 'Manama' });
        expect(errors.some((e) => e.field === 'city')).toBe(true);
    });

    test('partial update keeps existing values', () => {
        const existing = {
            listing_kind: 'licensed',
            purpose: 'rent',
            property_type: 'Apartment',
            city: 'Juffair',
            district: 'Block 123',
            price: 65000,
            area: 120,
            description: 'Spacious apartment in Juffair',
            contact_phone: '+97312345678',
            bedrooms: '3',
            living_rooms: '1',
            wc: '2',
            floor: 'Ground',
            age_less_than: 'New',
            premium_period: 'yearly',
            occupant_type: 'family'
        };
        const { errors, data } = validateListingPayload({ price: 70000 }, { partial: true, existing });
        expect(errors).toHaveLength(0);
        expect(data.price).toBe(70000);
        expect(data.city).toBe('Juffair');
    });
});

describe('validateContactPhone', () => {
    test('accepts valid Bahrain number', () => {
        const result = validateContactPhone('+97312345678');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('+97312345678');
    });

    test('rejects invalid Bahrain length', () => {
        const result = validateContactPhone('+9731234');
        expect(result.valid).toBe(false);
    });
});

describe('canAccessListing', () => {
    const listing = { owner_id: 5, deleted_at: null };

    test('owner can access own listing', () => {
        expect(canAccessListing(listing, 5, false).allowed).toBe(true);
    });

    test('other user is forbidden', () => {
        const result = canAccessListing(listing, 9, false);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('forbidden');
    });

    test('admin can access any listing', () => {
        expect(canAccessListing(listing, 1, true).allowed).toBe(true);
    });

    test('soft-deleted listing is not found', () => {
        const result = canAccessListing({ ...listing, deleted_at: new Date() }, 5, false);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('not_found');
    });

    test('missing listing is not found', () => {
        expect(canAccessListing(null, 5, false).reason).toBe('not_found');
    });
});
