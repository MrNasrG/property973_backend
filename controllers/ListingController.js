const crypto = require('crypto');
const { Op } = require('sequelize');
const PropertyListing = require('../models/PropertyListingModel');
const PropertyListingPhoto = require('../models/PropertyListingPhotoModel');
const User = require('../models/UserModel');
const Favourite = require('../models/FavouriteModel');
const {
    validateListingPayload,
    toDbPayload,
    canAccessListing,
    STATUSES,
    resolvePublicPurposeFilter,
    resolvePublicCityFilter,
    resolvePublicPropertyTypeFilter
} = require('../utils/listingValidation');
const { saveListingPhotos, deletePhotoFile } = require('../utils/listingPhotoStorage');
const { MAX_PHOTOS_PER_LISTING } = require('../middleware/listingPhotoUpload');

const ADMIN_EMAIL = 'admin@admin.com';

function parsePositiveInt(value, fallback) {
    const n = parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return n;
}

async function isAdminUser(userId) {
    const user = await User.findByPk(userId, { attributes: ['email'] });
    if (!user || !user.email) return false;
    return String(user.email).toLowerCase() === ADMIN_EMAIL;
}

function toPhotoResponse(photo) {
    return {
        id: photo.id,
        url: photo.url,
        order: photo.sort_order,
        createdAt: photo.created_at
    };
}

function buildSortOrder(sort) {
    let order = [['created_at', 'DESC']];
    const sortParam = String(sort || '-createdAt');
    if (sortParam.startsWith('-')) {
        const field = sortParam.slice(1);
        if (field === 'createdAt') order = [['created_at', 'DESC']];
        else if (field === 'updatedAt') order = [['updated_at', 'DESC']];
        else if (field === 'price') order = [['price', 'DESC']];
    } else if (sortParam === 'createdAt') {
        order = [['created_at', 'ASC']];
    } else if (sortParam === 'updatedAt') {
        order = [['updated_at', 'ASC']];
    } else if (sortParam === 'price') {
        order = [['price', 'ASC']];
    }
    return order;
}

function buildPublicListWhere(query) {
    const where = {
        status: 'active',
        deleted_at: null
    };

    const purposeResult = resolvePublicPurposeFilter(query.purpose);
    if (purposeResult.error) return { error: purposeResult.error };
    if (purposeResult.value) where.purpose = purposeResult.value;

    const cityResult = resolvePublicCityFilter(query.city);
    if (cityResult.error) return { error: cityResult.error };
    if (cityResult.value) where.city = cityResult.value;

    const propertyTypeInput =
        query.propertyType ?? query.property_type ?? query.propertyCategory ?? query.property_category;
    const propertyTypeResult = resolvePublicPropertyTypeFilter(propertyTypeInput);
    if (propertyTypeResult.error) return { error: propertyTypeResult.error };
    if (propertyTypeResult.values) {
        where.property_type =
            propertyTypeResult.values.length === 1
                ? propertyTypeResult.values[0]
                : { [Op.in]: propertyTypeResult.values };
    }

    return { where };
}

function toListingResponse(listing, photos, options = {}) {
    const { publicView = false } = options;
    const row = listing.get ? listing.get({ plain: true }) : listing;
    const photoRows = photos || row.photos || [];

    const response = {
        id: row.id,
        ownerId: row.owner_id,
        listingKind: row.listing_kind,
        purpose: row.purpose,
        propertyType: row.property_type,
        city: row.city,
        district: row.district,
        address: row.address,
        price: Number(row.price),
        premiumPeriod: row.premium_period,
        area: Number(row.area),
        bedrooms: row.bedrooms,
        livingRooms: row.living_rooms,
        wc: row.wc,
        floor: row.floor,
        ageLessThan: row.age_less_than,
        occupantType: row.occupant_type,
        streetWidth: row.street_width != null ? Number(row.street_width) : null,
        streetDirection: row.street_direction,
        furnished: row.furnished,
        carEntrance: row.car_entrance,
        airConditioned: row.air_conditioned,
        privateRoof: row.private_roof,
        inVilla: row.in_villa,
        twoEntrances: row.two_entrances,
        specialEntrance: row.special_entrance,
        description: row.description,
        allowInquiries: row.allow_inquiries,
        aqarPartnersAssistance: row.aqar_partners_assistance,
        photos: photoRows.map(toPhotoResponse),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

    if (publicView) {
        response.contactPhone = row.allow_inquiries ? row.contact_phone : null;
        delete response.aqarPartnersAssistance;
        delete response.deletedAt;
    } else {
        response.contactPhone = row.contact_phone;
        response.status = row.status;
        response.deletedAt = row.deleted_at || null;
    }

    return response;
}

function validationErrorResponse(res, errors) {
    return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors
    });
}

async function findOwnedListing(id, userId, admin) {
    const listing = await PropertyListing.findOne({
        where: { id },
        include: [{ model: PropertyListingPhoto, as: 'photos', separate: true, order: [['sort_order', 'ASC']] }]
    });
    const access = canAccessListing(listing, userId, admin);
    return { listing, access };
}

const createListing = async (req, res) => {
    try {
        const { errors, data } = validateListingPayload(req.body, { partial: false });
        if (errors.length) {
            return validationErrorResponse(res, errors);
        }

        const files = req.files || [];
        if (files.length > MAX_PHOTOS_PER_LISTING) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors: [{ field: 'photos', message: `Maximum ${MAX_PHOTOS_PER_LISTING} photos allowed` }]
            });
        }

        const id = crypto.randomUUID();
        const dbPayload = toDbPayload(data);
        dbPayload.id = id;
        dbPayload.owner_id = req.authUserId;
        dbPayload.status = data.status && STATUSES.includes(data.status) ? data.status : 'active';

        const listing = await PropertyListing.create(dbPayload);

        let photos = [];
        if (files.length) {
            const saved = await saveListingPhotos(files, id, req, 0);
            photos = await PropertyListingPhoto.bulkCreate(
                saved.map((p) => ({
                    id: p.id,
                    listing_id: id,
                    url: p.url,
                    storage_path: p.storage_path,
                    sort_order: p.sort_order
                }))
            );
        }

        return res.status(201).json({
            success: true,
            message: 'Listing created successfully',
            data: toListingResponse(listing, photos)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not create listing.' });
    }
};

const listPublicListings = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 12), 50);
        const offset = (page - 1) * limit;

        const filterResult = buildPublicListWhere(req.query);
        if (filterResult.error) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors: [filterResult.error]
            });
        }

        const { count, rows } = await PropertyListing.findAndCountAll({
            where: filterResult.where,
            order: buildSortOrder(req.query.sort),
            limit,
            offset,
            include: [{ model: PropertyListingPhoto, as: 'photos', separate: true, order: [['sort_order', 'ASC']] }]
        });

        let favouriteIds = null;
        if (req.authUserId && rows.length) {
            const favourites = await Favourite.findAll({
                where: {
                    user_id: req.authUserId,
                    listing_id: rows.map((row) => row.id)
                },
                attributes: ['listing_id']
            });
            favouriteIds = new Set(favourites.map((row) => row.listing_id));
        }

        return res.status(200).json({
            success: true,
            data: {
                items: rows.map((row) => {
                    const item = toListingResponse(row, null, { publicView: true });
                    if (favouriteIds) {
                        item.isFavourite = favouriteIds.has(row.id);
                    }
                    return item;
                }),
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
        return res.status(500).json({ success: false, message: 'Could not load listings.' });
    }
};

const getPublicListing = async (req, res) => {
    try {
        const listing = await PropertyListing.findOne({
            where: {
                id: req.params.id,
                status: 'active',
                deleted_at: null
            },
            include: [{ model: PropertyListingPhoto, as: 'photos', separate: true, order: [['sort_order', 'ASC']] }]
        });

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }

        const data = toListingResponse(listing, null, { publicView: true });
        if (req.authUserId) {
            const favourite = await Favourite.findOne({
                where: { user_id: req.authUserId, listing_id: listing.id },
                attributes: ['id']
            });
            data.isFavourite = Boolean(favourite);
        }

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load listing.' });
    }
};

const listListings = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
        const offset = (page - 1) * limit;

        const where = {
            owner_id: req.authUserId,
            deleted_at: null
        };

        if (req.query.purpose) {
            where.purpose = String(req.query.purpose);
        }
        if (req.query.status) {
            where.status = String(req.query.status);
        }

        const { count, rows } = await PropertyListing.findAndCountAll({
            where,
            order: buildSortOrder(req.query.sort),
            limit,
            offset,
            include: [{ model: PropertyListingPhoto, as: 'photos', separate: true, order: [['sort_order', 'ASC']] }]
        });

        return res.status(200).json({
            success: true,
            data: {
                items: rows.map((row) => toListingResponse(row)),
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
        return res.status(500).json({ success: false, message: 'Could not load listings.' });
    }
};

const getListing = async (req, res) => {
    try {
        const admin = await isAdminUser(req.authUserId);
        const { listing, access } = await findOwnedListing(req.params.id, req.authUserId, admin);

        if (!listing || access.reason === 'not_found') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        if (!access.allowed) {
            return res.status(403).json({ success: false, message: 'You do not have access to this listing.' });
        }

        return res.status(200).json({
            success: true,
            data: toListingResponse(listing)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load listing.' });
    }
};

const updateListing = async (req, res) => {
    try {
        const admin = await isAdminUser(req.authUserId);
        const { listing, access } = await findOwnedListing(req.params.id, req.authUserId, admin);

        if (!listing || access.reason === 'not_found') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        if (!access.allowed) {
            return res.status(403).json({ success: false, message: 'You do not have access to this listing.' });
        }

        const purposeOrTypeChanged =
            (req.body.purpose !== undefined && req.body.purpose !== listing.purpose) ||
            (req.body.propertyType !== undefined && req.body.propertyType !== listing.property_type) ||
            (req.body.property_type !== undefined && req.body.property_type !== listing.property_type);

        const { errors, data } = validateListingPayload(req.body, {
            partial: true,
            existing: listing
        });

        if (errors.length) {
            return validationErrorResponse(res, errors);
        }

        if (purposeOrTypeChanged) {
            const fullCheck = validateListingPayload(data, { partial: false });
            if (fullCheck.errors.length) {
                return validationErrorResponse(res, fullCheck.errors);
            }
        }

        const dbPayload = toDbPayload(data);
        if (Object.keys(dbPayload).length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Listing updated successfully',
                data: toListingResponse(listing)
            });
        }

        await listing.update(dbPayload);
        await listing.reload({
            include: [{ model: PropertyListingPhoto, as: 'photos', separate: true, order: [['sort_order', 'ASC']] }]
        });

        return res.status(200).json({
            success: true,
            message: 'Listing updated successfully',
            data: toListingResponse(listing)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not update listing.' });
    }
};

const deleteListing = async (req, res) => {
    try {
        const admin = await isAdminUser(req.authUserId);
        const { listing, access } = await findOwnedListing(req.params.id, req.authUserId, admin);

        if (!listing || access.reason === 'not_found') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        if (!access.allowed) {
            return res.status(403).json({ success: false, message: 'You do not have access to this listing.' });
        }

        await listing.update({
            deleted_at: new Date(),
            status: 'deleted'
        });

        return res.status(200).json({
            success: true,
            message: 'Listing deleted successfully'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not delete listing.' });
    }
};

const uploadPhotos = async (req, res) => {
    try {
        const admin = await isAdminUser(req.authUserId);
        const { listing, access } = await findOwnedListing(req.params.id, req.authUserId, admin);

        if (!listing || access.reason === 'not_found') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        if (!access.allowed) {
            return res.status(403).json({ success: false, message: 'You do not have access to this listing.' });
        }

        const files = req.files || [];
        if (!files.length) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors: [{ field: 'photos', message: 'At least one photo is required' }]
            });
        }

        const existingCount = await PropertyListingPhoto.count({ where: { listing_id: listing.id } });
        if (existingCount + files.length > MAX_PHOTOS_PER_LISTING) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors: [{
                    field: 'photos',
                    message: `Maximum ${MAX_PHOTOS_PER_LISTING} photos allowed per listing`
                }]
            });
        }

        const saved = await saveListingPhotos(files, listing.id, req, existingCount);
        await PropertyListingPhoto.bulkCreate(
            saved.map((p) => ({
                id: p.id,
                listing_id: listing.id,
                url: p.url,
                storage_path: p.storage_path,
                sort_order: p.sort_order
            }))
        );

        await listing.reload({
            include: [{ model: PropertyListingPhoto, as: 'photos', separate: true, order: [['sort_order', 'ASC']] }]
        });

        return res.status(200).json({
            success: true,
            message: 'Photos uploaded successfully',
            data: toListingResponse(listing)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not upload photos.' });
    }
};

const deletePhoto = async (req, res) => {
    try {
        const admin = await isAdminUser(req.authUserId);
        const { listing, access } = await findOwnedListing(req.params.id, req.authUserId, admin);

        if (!listing || access.reason === 'not_found') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        if (!access.allowed) {
            return res.status(403).json({ success: false, message: 'You do not have access to this listing.' });
        }

        const photo = await PropertyListingPhoto.findOne({
            where: { id: req.params.photoId, listing_id: listing.id }
        });
        if (!photo) {
            return res.status(404).json({ success: false, message: 'Photo not found.' });
        }

        await deletePhotoFile(photo.storage_path);
        await photo.destroy();

        return res.status(200).json({
            success: true,
            message: 'Photo deleted successfully'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not delete photo.' });
    }
};

module.exports = {
    createListing,
    listPublicListings,
    getPublicListing,
    listListings,
    getListing,
    buildPublicListWhere,
    buildSortOrder,
    updateListing,
    deleteListing,
    uploadPhotos,
    deletePhoto,
    toListingResponse,
    canAccessListing,
    isAdminUser,
    ADMIN_EMAIL
};
