const { normalizeMobile } = require('./mobile');

const LISTING_KINDS = Object.freeze(['licensed', 'marketing']);
const PURPOSES = Object.freeze(['rent', 'sale']);
const CITIES = Object.freeze(['Juffair', 'Seef', 'Saar', 'Busaiteen', 'Hidd']);
const PREMIUM_PERIODS = Object.freeze(['yearly', 'semi_annual', 'quarterly', 'monthly']);
const OCCUPANT_TYPES = Object.freeze(['single', 'family']);
const STATUSES = Object.freeze(['draft', 'active', 'inactive', 'deleted']);

const PROPERTY_TYPES = Object.freeze([
    'Apartment', 'Big flat', 'Villa', 'Store', 'Small house', 'Lounge', 'Office', 'Land', 'Tent',
    'Room', 'Floor', 'Chalet', 'Warehouse', 'Kiosk', 'Cinema', 'Parking', 'Bank / ATM', 'Factory',
    'Hospital', 'Power Station', 'Communication Tower', 'Complex', 'Tower', 'Hotel', 'Workshop',
    'School', 'Station', 'Farm', 'Others'
]);

/** Homepage filter chips → stored property_type values (GET /listings/public). */
const PUBLIC_PROPERTY_TYPE_FILTERS = Object.freeze({
    all: null,
    apartments: ['Apartment', 'Big flat'],
    lands: ['Land'],
    villas: ['Villa'],
    floors: ['Floor'],
    'commercial-offices': ['Office'],
    farms: ['Farm'],
    'rest-houses': ['Lounge', 'Chalet', 'Small house']
});

const PUBLIC_PROPERTY_TYPE_FILTER_ALIASES = Object.freeze({
    all: 'all',
    'all-type': 'all',
    'all-types': 'all',
    apartment: 'apartments',
    apartments: 'apartments',
    land: 'lands',
    lands: 'lands',
    villa: 'villas',
    villas: 'villas',
    floor: 'floors',
    floors: 'floors',
    office: 'commercial-offices',
    offices: 'commercial-offices',
    'commercial-office': 'commercial-offices',
    'commercial-offices': 'commercial-offices',
    farm: 'farms',
    farms: 'farms',
    'rest-house': 'rest-houses',
    'rest-houses': 'rest-houses',
    chalet: 'rest-houses',
    lounge: 'rest-houses'
});

const RESIDENTIAL_TYPES = Object.freeze([
    'Apartment', 'Big flat', 'Villa', 'Small house', 'Floor', 'Chalet', 'Room', 'Lounge'
]);

const LAND_TYPES = Object.freeze(['Land', 'Farm', 'Tent']);

const COMMERCIAL_TYPES = Object.freeze([
    'Store', 'Office', 'Warehouse', 'Kiosk', 'Cinema', 'Parking', 'Bank / ATM', 'Factory',
    'Hospital', 'Power Station', 'Communication Tower', 'Complex', 'Tower', 'Hotel', 'Workshop',
    'School', 'Station', 'Others'
]);

const BEDROOM_VALUES = Object.freeze(['1', '2', '3', '4', '5+']);
const LIVING_ROOM_VALUES = Object.freeze(['1', '2', '3', '4', '5+']);
const WC_VALUES = Object.freeze(['1', '2', '3', '4', '4+', '5+']);
const FLOOR_VALUES = Object.freeze([
    'Ground', 'Upper Ground', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20+'
]);
const AGE_VALUES = Object.freeze(['New', '2yrs', '3yrs', '4yrs', '5yrs', '6yrs', '7yrs', '8yrs', '9yrs', '10yrs', '11yrs', '12yrs', '13yrs', '14yrs', '15+yrs']);
const STREET_DIRECTIONS = Object.freeze([
    'North', 'East', 'South', 'West', 'Northeast', 'Southeast', 'Northwest', 'Southwest',
    '3 Streets', '4 Streets'
]);

const FEATURE_FIELDS = Object.freeze([
    'furnished', 'carEntrance', 'airConditioned', 'privateRoof', 'inVilla', 'twoEntrances', 'specialEntrance'
]);

const CONDITIONAL_FIELDS = Object.freeze([
    'premiumPeriod', 'bedrooms', 'livingRooms', 'wc', 'floor', 'ageLessThan', 'occupantType',
    'streetWidth', 'streetDirection', ...FEATURE_FIELDS
]);

const FIELD_TO_DB = Object.freeze({
    listingKind: 'listing_kind',
    purpose: 'purpose',
    propertyType: 'property_type',
    city: 'city',
    district: 'district',
    address: 'address',
    price: 'price',
    premiumPeriod: 'premium_period',
    area: 'area',
    bedrooms: 'bedrooms',
    livingRooms: 'living_rooms',
    wc: 'wc',
    floor: 'floor',
    ageLessThan: 'age_less_than',
    occupantType: 'occupant_type',
    streetWidth: 'street_width',
    streetDirection: 'street_direction',
    furnished: 'furnished',
    carEntrance: 'car_entrance',
    airConditioned: 'air_conditioned',
    privateRoof: 'private_roof',
    inVilla: 'in_villa',
    twoEntrances: 'two_entrances',
    specialEntrance: 'special_entrance',
    description: 'description',
    contactPhone: 'contact_phone',
    allowInquiries: 'allow_inquiries',
    aqarPartnersAssistance: 'aqar_partners_assistance',
    status: 'status'
});

const DB_TO_FIELD = Object.freeze(
    Object.fromEntries(Object.entries(FIELD_TO_DB).map(([k, v]) => [v, k]))
);

function isResidential(propertyType) {
    return RESIDENTIAL_TYPES.includes(propertyType);
}

function isLand(propertyType) {
    return LAND_TYPES.includes(propertyType);
}

function isCommercial(propertyType) {
    return COMMERCIAL_TYPES.includes(propertyType);
}

/**
 * Mirrors frontend getVisibleOwnerPropertyFields(purpose, propertyType).
 * @returns {Set<string>} camelCase field names visible for the combination.
 */
function getVisibleOwnerPropertyFields(purpose, propertyType) {
    const visible = new Set([
        'listingKind', 'purpose', 'propertyType', 'city', 'district', 'address',
        'price', 'area', 'description', 'contactPhone', 'allowInquiries', 'aqarPartnersAssistance'
    ]);

    const isRent = purpose === 'rent';
    const isApartment = propertyType === 'Apartment';
    const isVilla = propertyType === 'Villa';

    if ((isRent || purpose === 'sale') && (isApartment || isVilla)) {
        visible.add('bedrooms');
        visible.add('livingRooms');
        visible.add('wc');
        visible.add('floor');
        visible.add('ageLessThan');
        FEATURE_FIELDS.forEach((f) => visible.add(f));
        if (isRent) {
            visible.add('premiumPeriod');
            visible.add('occupantType');
        }
        if (isVilla) {
            visible.add('streetWidth');
            visible.add('streetDirection');
        }
    } else if (isLand(propertyType)) {
        visible.add('streetWidth');
        visible.add('streetDirection');
    } else if (isCommercial(propertyType)) {
        visible.add('floor');
        visible.add('ageLessThan');
        visible.add('carEntrance');
        visible.add('twoEntrances');
        visible.add('specialEntrance');
        if (isRent) {
            visible.add('premiumPeriod');
        }
    } else if (isResidential(propertyType)) {
        visible.add('bedrooms');
        visible.add('livingRooms');
        visible.add('wc');
        FEATURE_FIELDS.forEach((f) => visible.add(f));
        if (isRent) {
            visible.add('premiumPeriod');
        }
    }

    return visible;
}

function getRequiredFields(purpose, propertyType) {
    const required = new Set([
        'listingKind', 'purpose', 'propertyType', 'city', 'district', 'price', 'area', 'description', 'contactPhone'
    ]);

    const visible = getVisibleOwnerPropertyFields(purpose, propertyType);
    const isRent = purpose === 'rent';

    if (visible.has('premiumPeriod') && (isResidential(propertyType) || isCommercial(propertyType)) && isRent) {
        required.add('premiumPeriod');
    }
    if (visible.has('bedrooms') && isResidential(propertyType)) {
        required.add('bedrooms');
        required.add('livingRooms');
        required.add('wc');
    }
    if (visible.has('floor') && (isResidential(propertyType) || isCommercial(propertyType))) {
        required.add('floor');
    }
    if (visible.has('ageLessThan') && (isResidential(propertyType) || isCommercial(propertyType))) {
        required.add('ageLessThan');
    }
    if (visible.has('occupantType') && isRent && isResidential(propertyType)) {
        required.add('occupantType');
    }
    if (visible.has('streetWidth') && (propertyType === 'Villa' || isLand(propertyType))) {
        required.add('streetWidth');
        required.add('streetDirection');
    }

    return required;
}

function parseBoolean(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'boolean') return value;
    const s = String(value).trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return null;
}

function parseNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
}

function emptyToNull(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

function pickInput(body, camelKey, snakeKey) {
    if (body[camelKey] !== undefined) return body[camelKey];
    if (snakeKey && body[snakeKey] !== undefined) return body[snakeKey];
    return undefined;
}

function normalizeAgeLessThan(value) {
    const v = emptyToNull(value);
    if (!v) return null;
    if (v === 'New' || v === '15+yrs') return v;
    const match = /^(\d+)yrs$/.exec(v);
    if (match) {
        const n = parseInt(match[1], 10);
        if (n >= 2 && n <= 14) return `${n}yrs`;
    }
    if (AGE_VALUES.includes(v)) return v;
    return v;
}

function addError(errors, field, message) {
    errors.push({ field, message });
}

function validateListingPayload(rawBody, options = {}) {
    const { partial = false, existing = null } = options;
    const errors = [];
    const body = rawBody || {};

    const merged = {};
    if (existing) {
        const plain = existing.get ? existing.get({ plain: true }) : existing;
        for (const [dbKey, camelKey] of Object.entries(DB_TO_FIELD)) {
            if (plain[dbKey] !== undefined && plain[dbKey] !== null) {
                let val = plain[dbKey];
                if (dbKey === 'price' || dbKey === 'area' || dbKey === 'street_width') {
                    val = Number(val);
                }
                merged[camelKey] = val;
            }
        }
    }

    const scalarKeys = [
        ['listingKind', 'listing_kind'],
        ['purpose', null],
        ['propertyType', 'property_type'],
        ['city', null],
        ['district', null],
        ['address', null],
        ['premiumPeriod', 'premium_period'],
        ['bedrooms', null],
        ['livingRooms', 'living_rooms'],
        ['wc', null],
        ['floor', null],
        ['ageLessThan', 'age_less_than'],
        ['occupantType', 'occupant_type'],
        ['streetDirection', 'street_direction'],
        ['description', null],
        ['contactPhone', 'contact_phone']
    ];

    for (const [camel, snake] of scalarKeys) {
        const val = pickInput(body, camel, snake);
        if (val !== undefined) merged[camel] = val;
    }

    if (pickInput(body, 'price', null) !== undefined) merged.price = pickInput(body, 'price', null);
    if (pickInput(body, 'area', null) !== undefined) merged.area = pickInput(body, 'area', null);
    if (pickInput(body, 'streetWidth', 'street_width') !== undefined) {
        merged.streetWidth = pickInput(body, 'streetWidth', 'street_width');
    }
    if (pickInput(body, 'allowInquiries', 'allow_inquiries') !== undefined) {
        merged.allowInquiries = pickInput(body, 'allowInquiries', 'allow_inquiries');
    }
    if (pickInput(body, 'aqarPartnersAssistance', 'aqar_partners_assistance') !== undefined) {
        merged.aqarPartnersAssistance = pickInput(body, 'aqarPartnersAssistance', 'aqar_partners_assistance');
    }
    for (const f of FEATURE_FIELDS) {
        const snake = FIELD_TO_DB[f];
        const val = pickInput(body, f, snake);
        if (val !== undefined) merged[f] = val;
    }

    const purpose = emptyToNull(merged.purpose);
    const propertyType = emptyToNull(merged.propertyType);

    if (!partial || merged.listingKind !== undefined) {
        const listingKind = emptyToNull(merged.listingKind);
        if (!listingKind) {
            addError(errors, 'listingKind', 'Listing kind is required');
        } else if (!LISTING_KINDS.includes(listingKind)) {
            addError(errors, 'listingKind', 'Invalid listing kind');
        } else {
            merged.listingKind = listingKind;
        }
    }

    if (!partial || merged.purpose !== undefined) {
        if (!purpose) {
            addError(errors, 'purpose', 'Purpose is required');
        } else if (!PURPOSES.includes(purpose)) {
            addError(errors, 'purpose', 'Invalid purpose');
        }
    }

    if (!partial || merged.propertyType !== undefined) {
        if (!propertyType) {
            addError(errors, 'propertyType', 'Property type is required');
        } else if (!PROPERTY_TYPES.includes(propertyType)) {
            addError(errors, 'propertyType', 'Invalid property type');
        }
    }

    if (!partial || merged.city !== undefined) {
        const city = emptyToNull(merged.city);
        if (!city) {
            addError(errors, 'city', 'City is required');
        } else if (!CITIES.includes(city)) {
            addError(errors, 'city', 'Invalid city');
        } else {
            merged.city = city;
        }
    }

    if (!partial || merged.district !== undefined) {
        const district = emptyToNull(merged.district);
        if (!district) {
            addError(errors, 'district', 'District is required');
        } else {
            merged.district = district;
        }
    }

    if (merged.address !== undefined) {
        merged.address = emptyToNull(merged.address);
    }

    if (!partial || merged.price !== undefined) {
        const price = parseNumber(merged.price);
        if (price === null) {
            addError(errors, 'price', 'Price is required');
        } else if (price < 0) {
            addError(errors, 'price', 'Price must be zero or greater');
        } else {
            merged.price = price;
        }
    }

    if (!partial || merged.area !== undefined) {
        const area = parseNumber(merged.area);
        if (area === null) {
            addError(errors, 'area', 'Area is required');
        } else if (area < 0) {
            addError(errors, 'area', 'Area must be zero or greater');
        } else {
            merged.area = area;
        }
    }

    if (!partial || merged.description !== undefined) {
        const description = emptyToNull(merged.description);
        if (!description) {
            addError(errors, 'description', 'Description is required');
        } else if (description.length < 10) {
            addError(errors, 'description', 'Description must be at least 10 characters');
        } else {
            merged.description = description;
        }
    }

    if (!partial || merged.contactPhone !== undefined) {
        const { validateContactPhone } = require('./contactPhone');
        const phoneResult = validateContactPhone(merged.contactPhone);
        if (!phoneResult.valid) {
            addError(errors, 'contactPhone', phoneResult.message);
        } else {
            merged.contactPhone = phoneResult.normalized;
        }
    }

    if (purpose && propertyType && errors.length === 0) {
        const visible = getVisibleOwnerPropertyFields(purpose, propertyType);
        const required = getRequiredFields(purpose, propertyType);

        for (const field of CONDITIONAL_FIELDS) {
            if (!visible.has(field)) {
                merged[field] = null;
            }
        }

        if (visible.has('premiumPeriod') && merged.premiumPeriod !== undefined && merged.premiumPeriod !== null) {
            const pp = emptyToNull(merged.premiumPeriod);
            if (pp && !PREMIUM_PERIODS.includes(pp)) {
                addError(errors, 'premiumPeriod', 'Invalid premium period');
            } else {
                merged.premiumPeriod = pp;
            }
        }

        if (visible.has('bedrooms')) {
            const val = emptyToNull(merged.bedrooms);
            if (required.has('bedrooms') && !val && (!partial || merged.bedrooms !== undefined)) {
                addError(errors, 'bedrooms', 'Bedrooms is required');
            } else if (val && !BEDROOM_VALUES.includes(val)) {
                addError(errors, 'bedrooms', 'Invalid bedrooms value');
            } else {
                merged.bedrooms = val;
            }
        }

        if (visible.has('livingRooms')) {
            const val = emptyToNull(merged.livingRooms);
            if (required.has('livingRooms') && !val && (!partial || merged.livingRooms !== undefined)) {
                addError(errors, 'livingRooms', 'Living rooms is required');
            } else if (val && !LIVING_ROOM_VALUES.includes(val)) {
                addError(errors, 'livingRooms', 'Invalid living rooms value');
            } else {
                merged.livingRooms = val;
            }
        }

        if (visible.has('wc')) {
            const val = emptyToNull(merged.wc);
            if (required.has('wc') && !val && (!partial || merged.wc !== undefined)) {
                addError(errors, 'wc', 'WC count is required');
            } else if (val && !WC_VALUES.includes(val)) {
                addError(errors, 'wc', 'Invalid WC value');
            } else {
                merged.wc = val;
            }
        }

        if (visible.has('floor')) {
            const val = emptyToNull(merged.floor);
            if (required.has('floor') && !val && (!partial || merged.floor !== undefined)) {
                addError(errors, 'floor', 'Floor is required');
            } else if (val && !FLOOR_VALUES.includes(val)) {
                addError(errors, 'floor', 'Invalid floor value');
            } else {
                merged.floor = val;
            }
        }

        if (visible.has('ageLessThan')) {
            const val = normalizeAgeLessThan(merged.ageLessThan);
            if (required.has('ageLessThan') && !val && (!partial || merged.ageLessThan !== undefined)) {
                addError(errors, 'ageLessThan', 'Property age is required');
            } else if (val && !AGE_VALUES.includes(val)) {
                addError(errors, 'ageLessThan', 'Invalid property age value');
            } else {
                merged.ageLessThan = val;
            }
        }

        if (visible.has('occupantType')) {
            const val = emptyToNull(merged.occupantType);
            if (required.has('occupantType') && !val && (!partial || merged.occupantType !== undefined)) {
                addError(errors, 'occupantType', 'Occupant type is required');
            } else if (val && !OCCUPANT_TYPES.includes(val)) {
                addError(errors, 'occupantType', 'Invalid occupant type');
            } else {
                merged.occupantType = val;
            }
        }

        if (visible.has('streetWidth')) {
            const val = parseNumber(merged.streetWidth);
            if (required.has('streetWidth') && val === null && (!partial || merged.streetWidth !== undefined)) {
                addError(errors, 'streetWidth', 'Street width is required');
            } else if (val !== null && val < 0) {
                addError(errors, 'streetWidth', 'Street width must be zero or greater');
            } else {
                merged.streetWidth = val;
            }
        }

        if (visible.has('streetDirection')) {
            const val = emptyToNull(merged.streetDirection);
            if (required.has('streetDirection') && !val && (!partial || merged.streetDirection !== undefined)) {
                addError(errors, 'streetDirection', 'Street direction is required');
            } else if (val && !STREET_DIRECTIONS.includes(val)) {
                addError(errors, 'streetDirection', 'Invalid street direction');
            } else {
                merged.streetDirection = val;
            }
        }

        for (const f of FEATURE_FIELDS) {
            if (visible.has(f)) {
                if (merged[f] !== undefined && merged[f] !== null && merged[f] !== '') {
                    const parsed = parseBoolean(merged[f]);
                    if (parsed === null) {
                        addError(errors, f, `${f} must be a boolean`);
                    } else {
                        merged[f] = parsed;
                    }
                } else {
                    merged[f] = null;
                }
            }
        }

        if (!partial) {
            for (const field of required) {
                if (field === 'listingKind' || field === 'purpose' || field === 'propertyType' ||
                    field === 'city' || field === 'district' || field === 'price' ||
                    field === 'area' || field === 'description' || field === 'contactPhone') {
                    continue;
                }
                const val = merged[field];
                if (val === undefined || val === null || val === '') {
                    addError(errors, field, `${field} is required`);
                }
            }
        }

        if (merged.allowInquiries === undefined || merged.allowInquiries === null) {
            merged.allowInquiries = true;
        } else {
            merged.allowInquiries = parseBoolean(merged.allowInquiries) ?? true;
        }

        if (merged.aqarPartnersAssistance === undefined || merged.aqarPartnersAssistance === null) {
            merged.aqarPartnersAssistance = false;
        } else {
            merged.aqarPartnersAssistance = parseBoolean(merged.aqarPartnersAssistance) ?? false;
        }
    }

    return { errors, data: merged };
}

function toDbPayload(camelData) {
    const db = {};
    for (const [camel, snake] of Object.entries(FIELD_TO_DB)) {
        if (camelData[camel] !== undefined) {
            db[snake] = camelData[camel];
        }
    }
    return db;
}

function canAccessListing(listing, userId, isAdmin) {
    if (!listing) return { allowed: false, reason: 'not_found' };
    if (listing.deleted_at) return { allowed: false, reason: 'not_found' };
    if (isAdmin) return { allowed: true };
    if (listing.owner_id === userId) return { allowed: true };
    return { allowed: false, reason: 'forbidden' };
}

function normalizePublicFilterKey(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/&/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-');
}

function isAllFilterValue(value) {
    if (value !== undefined && value !== null && Array.isArray(value)) {
        value = value[0];
    }
    if (value === undefined || value === null) return true;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === '' || normalized === 'all' || normalized === 'any') return true;
    if (normalized === 'null' || normalized === 'undefined') return true;
    const slug = normalizePublicFilterKey(value);
    return slug === 'all-type' || slug === 'all-types' || slug === 'rent-sale' || slug === 'rent-and-sale';
}

/**
 * Resolves homepage purpose filter: omit / all → both rent & sale.
 * @returns {{ value?: string, error?: { field: string, message: string } }}
 */
function resolvePublicPurposeFilter(value) {
    if (value !== undefined && value !== null && Array.isArray(value)) {
        value = value[0];
    }
    if (isAllFilterValue(value)) return {};
    const purpose = String(value).trim().toLowerCase();
    if (!PURPOSES.includes(purpose)) {
        return { error: { field: 'purpose', message: 'Invalid purpose filter' } };
    }
    return { value: purpose };
}

/**
 * Resolves homepage city filter: omit / all → any city.
 * @returns {{ value?: string, error?: { field: string, message: string } }}
 */
function resolvePublicCityFilter(value) {
    if (value !== undefined && value !== null && Array.isArray(value)) {
        value = value[0];
    }
    if (isAllFilterValue(value)) return {};
    const city = String(value).trim();
    const match = CITIES.find((c) => c.toLowerCase() === city.toLowerCase());
    if (!match) {
        return { error: { field: 'city', message: 'Invalid city filter' } };
    }
    return { value: match };
}

/**
 * Resolves homepage property-type filter: omit / all → any type; category chip → Op.in list; exact type → single match.
 * @returns {{ values?: string[], error?: { field: string, message: string } }}
 */
function resolvePublicPropertyTypeFilter(value) {
    if (value !== undefined && value !== null && Array.isArray(value)) {
        value = value[0];
    }
    if (isAllFilterValue(value)) return {};
    const raw = String(value).trim();
    if (PROPERTY_TYPES.includes(raw)) {
        return { values: [raw] };
    }
    const key = PUBLIC_PROPERTY_TYPE_FILTER_ALIASES[normalizePublicFilterKey(raw)];
    if (!key) {
        return {
            error: {
                field: 'propertyType',
                message: 'Invalid property type filter'
            }
        };
    }
    if (key === 'all') return {};
    return { values: [...PUBLIC_PROPERTY_TYPE_FILTERS[key]] };
}

module.exports = {
    LISTING_KINDS,
    PURPOSES,
    CITIES,
    PREMIUM_PERIODS,
    OCCUPANT_TYPES,
    STATUSES,
    PROPERTY_TYPES,
    PUBLIC_PROPERTY_TYPE_FILTERS,
    PUBLIC_PROPERTY_TYPE_FILTER_ALIASES,
    resolvePublicPurposeFilter,
    resolvePublicCityFilter,
    resolvePublicPropertyTypeFilter,
    RESIDENTIAL_TYPES,
    LAND_TYPES,
    COMMERCIAL_TYPES,
    FEATURE_FIELDS,
    FIELD_TO_DB,
    DB_TO_FIELD,
    getVisibleOwnerPropertyFields,
    getRequiredFields,
    validateListingPayload,
    toDbPayload,
    canAccessListing
};
