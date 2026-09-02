const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', 'config.env'),
});

function buildConfig() {
  
  const dbSocket = (process.env.DB_SOCKET || '').trim();
  /** @type {Record<string, unknown>} */
  const base = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME,
    dialect: 'mysql',
    logging: false,
  };
  if (dbSocket) {
    base.dialectOptions = { socketPath: dbSocket.replace(/\\/g, '/') };
  } else {
    const rawHost = (process.env.DB_HOST || '127.0.0.1').trim();
    base.host =
      rawHost.toLowerCase() === 'localhost' ? '127.0.0.1' : rawHost;
    base.port = parseInt(String(process.env.DB_PORT || '3306'), 10);
  }
  return base;
}

module.exports = {
  development: buildConfig(),
  production: buildConfig(),
};
