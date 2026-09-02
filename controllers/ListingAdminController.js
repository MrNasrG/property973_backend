const { Op } = require('sequelize');
const PropertyListing = require('../models/PropertyListingModel');
const PropertyListingPhoto = require('../models/PropertyListingPhotoModel');
const User = require('../models/UserModel');
const { resolveDateRange } = require('../utils/listingAdminDateFilter');

const index = async (req, res) => {
    const month = String(req.query.month || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const range = resolveDateRange({ month, dateFrom, dateTo });

    try {
        const where = { deleted_at: null };
        if (range.clause) {
            where[Op.and] = [range.clause];
        }

        const listings = await PropertyListing.findAll({
            where,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: PropertyListingPhoto,
                    as: 'photos',
                    separate: true,
                    order: [['sort_order', 'ASC']],
                    limit: 1
                }
            ]
        });
        return res.render('listings/index', {
            title: 'Property Listings',
            navActive: 'listings',
            listings,
            month: range.month,
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
            filterError: range.error,
            filterActive: Boolean(range.clause)
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Could not load property listings.');
        return res.redirect('/index');
    }
};

const show = async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
        req.flash('error', 'Invalid listing.');
        return res.redirect('/database/listings');
    }
    try {
        const listing = await PropertyListing.findOne({
            where: { id, deleted_at: null },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: {
                        exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'refresh_token_jti', 'refresh_token_expires']
                    }
                },
                {
                    model: PropertyListingPhoto,
                    as: 'photos',
                    separate: true,
                    order: [['sort_order', 'ASC']]
                }
            ]
        });
        if (!listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/database/listings');
        }
        return res.render('listings/show', {
            title: 'Property Listing Details',
            navActive: 'listings',
            listing
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Could not load listing.');
        return res.redirect('/database/listings');
    }
};

module.exports = { index, show };
