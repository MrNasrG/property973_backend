const path = require('path');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const dbSocket = (process.env.DB_SOCKET || '').trim();
const useSocket = dbSocket.length > 0;

/** @type {import('sequelize').Options} */
const sequelizeOpts = {
    dialect: 'mysql',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
};

if (useSocket) {
    sequelizeOpts.dialectOptions = { socketPath: dbSocket.replace(/\\/g, '/') };
} else {
    // Avoid IPv6 loopback (::1): MySQL grants are host-specific; `localhost` often
    // resolves to ::1 while hPanel users are typically allowed for 127.0.0.1 / localhost only.
    const rawHost = (process.env.DB_HOST || '127.0.0.1').trim();
    sequelizeOpts.host =
        rawHost.toLowerCase() === 'localhost' ? '127.0.0.1' : rawHost;
    sequelizeOpts.port = parseInt(String(process.env.DB_PORT || '3306'), 10);
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || '',
    sequelizeOpts
);

module.exports = sequelize;
