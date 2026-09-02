const User = require('../models/UserModel');
const PropertyListing = require('../models/PropertyListingModel');

async function getStats() {
    const [totalUsers, totalListedProperties] = await Promise.all([
        User.count(),
        PropertyListing.count({ where: { deleted_at: null } })
    ]);
    return { totalUsers, totalListedProperties };
}

const index = async (req, res) => {
    try {
        const stats = await getStats();
        return res.render('index', {
            title: 'Dashboard',
            navActive: 'dashboard',
            ...stats
        });
    } catch (err) {
        console.error(err);
        return res.render('index', {
            title: 'Dashboard',
            navActive: 'dashboard',
            totalUsers: 0,
            totalListedProperties: 0
        });
    }
};

module.exports = { index };
