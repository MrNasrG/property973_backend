const crypto = require('crypto');
const Favourite = require('../models/FavouriteModel');
const PropertyListing = require('../models/PropertyListingModel');
const PropertyListingPhoto = require('../models/PropertyListingPhotoModel');
const User = require('../models/UserModel');
const { toListingResponse } = require('./ListingController');

function parsePositiveInt(value, fallback) {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return n;
}

const listingInclude = [
    {
        model: PropertyListingPhoto,
        as: 'photos',
        separate: true,
        order: [['sort_order', 'ASC']]
    },
    {
        model: User,
        as: 'owner',
        attributes: ['id', 'name']
    }
];

function toFavouriteListingResponse(favourite) {
    const listing = favourite.listing;
    const response = toListingResponse(listing, null, { publicView: true });
    response.status = listing.status;
    const owner = listing.owner;
    response.owner = owner ? { fullName: owner.name } : null;
    response.contactName = owner ? owner.name : null;
    response.favouritedAt = favourite.created_at;
    return response;
}

async function findPublicListing(listingId) {
    return PropertyListing.findOne({
        where: {
            id: listingId,
            status: 'active',
            deleted_at: null
        },
        include: listingInclude
    });
}

const listFavourites = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 50), 50);
        const offset = (page - 1) * limit;

        const { count, rows } = await Favourite.findAndCountAll({
            where: { user_id: req.authUserId },
            include: [
                {
                    model: PropertyListing,
                    as: 'listing',
                    required: true,
                    where: {
                        status: 'active',
                        deleted_at: null
                    },
                    include: listingInclude
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        return res.status(200).json({
            success: true,
            message: 'Favourites fetched successfully',
            data: {
                items: rows.map(toFavouriteListingResponse),
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit) || 0
                }
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load favourites.' });
    }
};

const listFavouriteIds = async (req, res) => {
    try {
        const rows = await Favourite.findAll({
            where: { user_id: req.authUserId },
            attributes: ['listing_id'],
            include: [
                {
                    model: PropertyListing,
                    as: 'listing',
                    required: true,
                    attributes: [],
                    where: {
                        status: 'active',
                        deleted_at: null
                    }
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({
            success: true,
            message: 'Favourite ids fetched successfully',
            data: {
                ids: rows.map((row) => row.listing_id)
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load favourite ids.' });
    }
};

const addFavourite = async (req, res) => {
    try {
        const listingId = req.body && req.body.listingId != null ? String(req.body.listingId).trim() : '';
        if (!listingId) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors: [{ field: 'listingId', message: 'listingId is required' }]
            });
        }

        const listing = await findPublicListing(listingId);
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }

        const existing = await Favourite.findOne({
            where: { user_id: req.authUserId, listing_id: listingId }
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Listing is already in favourites.'
            });
        }

        const favourite = await Favourite.create({
            id: crypto.randomUUID(),
            user_id: req.authUserId,
            listing_id: listingId
        });
        favourite.listing = listing;

        return res.status(201).json({
            success: true,
            message: 'Added to favourites',
            data: {
                listingId,
                listing: toFavouriteListingResponse(favourite)
            }
        });
    } catch (err) {
        if (err && err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Listing is already in favourites.'
            });
        }
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not add favourite.' });
    }
};

const removeFavourite = async (req, res) => {
    try {
        const listingId = String(req.params.listingId || '').trim();
        if (!listingId) {
            return res.status(404).json({ success: false, message: 'Favourite not found.' });
        }

        const favourite = await Favourite.findOne({
            where: { user_id: req.authUserId, listing_id: listingId }
        });
        if (!favourite) {
            return res.status(404).json({ success: false, message: 'Favourite not found.' });
        }

        await favourite.destroy();

        return res.status(200).json({
            success: true,
            message: 'Removed from favourites',
            data: { listingId }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not remove favourite.' });
    }
};

module.exports = {
    listFavourites,
    listFavouriteIds,
    addFavourite,
    removeFavourite
};
