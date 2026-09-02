const ROLES = Object.freeze(['broker', 'owner', 'host']);
const LISTING_KINDS = Object.freeze(['licensed', 'marketing', 'dailyMonthly']);

const ROLE_LISTING_KINDS = Object.freeze({
    broker: ['licensed'],
    owner: ['licensed', 'marketing'],
    host: ['dailyMonthly']
});

const DEFAULT_LISTING_KIND_BY_ROLE = Object.freeze({
    broker: 'licensed',
    owner: 'licensed',
    host: 'dailyMonthly'
});

function isValidRole(role) {
    return ROLES.includes(role);
}

function isValidListingKind(listingKind) {
    return LISTING_KINDS.includes(listingKind);
}

function defaultListingKindForRole(role) {
    return DEFAULT_LISTING_KIND_BY_ROLE[role] ?? null;
}

function allowedListingKindsForRole(role) {
    return ROLE_LISTING_KINDS[role] ?? [];
}

function isRoleListingKindPairValid(role, listingKind) {
    if (!isValidRole(role) || !isValidListingKind(listingKind)) {
        return false;
    }
    return allowedListingKindsForRole(role).includes(listingKind);
}

function getAddListingOptions() {
    return {
        roles: ROLES.map((id) => ({
            id,
            defaultListingKind: defaultListingKindForRole(id),
            listingKinds: allowedListingKindsForRole(id)
        })),
        listingKinds: LISTING_KINDS.map((id) => ({
            id,
            step: id === 'marketing' ? 2 : 1
        }))
    };
}

module.exports = {
    ROLES,
    LISTING_KINDS,
    ROLE_LISTING_KINDS,
    DEFAULT_LISTING_KIND_BY_ROLE,
    isValidRole,
    isValidListingKind,
    defaultListingKindForRole,
    allowedListingKindsForRole,
    isRoleListingKindPairValid,
    getAddListingOptions
};
