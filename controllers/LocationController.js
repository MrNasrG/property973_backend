const Country = require('../models/CountryModel');
const State = require('../models/StateModel');
const City = require('../models/CityModel');

function parsePositiveIntQuery(param) {
    const n = parseInt(String(param), 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
}

const listCountries = async (req, res) => {
    try {
        const countries = await Country.findAll({
            order: [['name', 'ASC']],
            attributes: ['id', 'iso2', 'name']
        });
        return res.status(200).json({
            success: true,
            data: { countries }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load countries.' });
    }
};

const listStates = async (req, res) => {
    try {
        const countryId = parsePositiveIntQuery(req.query.countryId);
        if (!countryId) {
            return res.status(400).json({
                success: false,
                message: 'countryId query parameter is required (positive integer).'
            });
        }

        const states = await State.findAll({
            where: { country_id: countryId },
            order: [['name', 'ASC']],
            attributes: ['id', 'country_id', 'name']
        });

        return res.status(200).json({
            success: true,
            data: { states }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load states.' });
    }
};

const listCities = async (req, res) => {
    try {
        const stateId = parsePositiveIntQuery(req.query.stateId);
        if (!stateId) {
            return res.status(400).json({
                success: false,
                message: 'stateId query parameter is required (positive integer).'
            });
        }

        const cities = await City.findAll({
            where: { state_id: stateId },
            order: [['name', 'ASC']],
            attributes: ['id', 'state_id', 'name']
        });

        return res.status(200).json({
            success: true,
            data: { cities }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not load cities.' });
    }
};

module.exports = {
    listCountries,
    listStates,
    listCities
};
