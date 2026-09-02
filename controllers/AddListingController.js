const ListingPreference = require('../models/ListingPreferenceModel');
const {
    isValidRole,
    isValidListingKind,
    defaultListingKindForRole,
    isRoleListingKindPairValid,
    getAddListingOptions
} = require('../utils/addListingValidation');

function toPreferenceResponse(record) {
    return {
        role: record.role,
        listingKind: record.listing_kind,
        updatedAt: record.updated_at
    };
}

const getOptions = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: getAddListingOptions()
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Could not load add-listing options.'
        });
    }
};

const getPreference = async (req, res) => {
    try {
        const preference = await ListingPreference.findOne({
            where: { user_id: req.authUserId }
        });

        if (!preference) {
            return res.status(200).json({
                success: true,
                data: { preference: null }
            });
        }

        return res.status(200).json({
            success: true,
            data: { preference: toPreferenceResponse(preference) }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Could not load listing preference.'
        });
    }
};

const savePreference = async (req, res) => {
    const body = req.body || {};
    const role = body.role != null ? String(body.role).trim() : '';
    const listingKindRaw =
        body.listingKind !== undefined
            ? body.listingKind
            : body.listing_kind !== undefined
              ? body.listing_kind
              : undefined;

    if (!role) {
        return res.status(400).json({
            success: false,
            message: 'role is required (broker, owner, or host).'
        });
    }

    if (!isValidRole(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role. Must be broker, owner, or host.'
        });
    }

    let listingKind =
        listingKindRaw === undefined || listingKindRaw === null
            ? defaultListingKindForRole(role)
            : String(listingKindRaw).trim();

    if (!listingKind) {
        listingKind = defaultListingKindForRole(role);
    }

    if (!isValidListingKind(listingKind)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid listingKind. Must be licensed, marketing, or dailyMonthly.'
        });
    }

    if (!isRoleListingKindPairValid(role, listingKind)) {
        return res.status(400).json({
            success: false,
            message: `listingKind "${listingKind}" is not allowed for role "${role}".`
        });
    }

    try {
        const [preference] = await ListingPreference.upsert(
            {
                user_id: req.authUserId,
                role,
                listing_kind: listingKind
            },
            { returning: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Listing preference saved.',
            data: { preference: toPreferenceResponse(preference) }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Could not save listing preference.'
        });
    }
};

module.exports = {
    getOptions,
    getPreference,
    savePreference
};
