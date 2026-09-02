const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, 'config.env') });
const sequelize = require('./config/database');
var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
const cors = require('cors');

var pageRouter = require('./routes/routes');
var session = require('express-session');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');

const productionOrigins = [
    'https://property973.com',
    'https://www.property973.com'
];

const localDevOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

function corsAllowedOrigins() {
    const raw = (process.env.CORS_ALLOWED_ORIGINS || '').trim();
    const fromEnv = raw
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : productionOrigins;

    const allowLocalhost = (process.env.CORS_ALLOW_LOCALHOST || '1').trim().toLowerCase();
    const includeLocal = allowLocalhost === '1' || allowLocalhost === 'true' || allowLocalhost === 'yes';
    if (includeLocal) {
        return [...new Set([...fromEnv, ...localDevOrigins])];
    }
    return fromEnv;
}

const allowedOrigins = corsAllowedOrigins();

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.options(/^\/(auth|api|listings|favourites)(\/|$)/, cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ resave: false, saveUninitialized: true, secret: process.env.SESSION_SECRET || 'nodedemo123' }));
app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
    res.locals.messages = {
        error: req.flash('error'),
        message: req.flash('message')
    };
    next();
});

/* MySQL database connection */
sequelize.authenticate()
    .then(() => {
        console.log('MySQL connection successfully established!');
        return sequelize.sync({ alter: false });
    })
    .then(() => {
        console.log('Database synchronized successfully!');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static('public'));

var expressLayouts = require('express-ejs-layouts');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout/layout');

// Define All Routes
pageRouter(app);

app.all('*', function (req, res) {
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    if (
        req.path.startsWith('/auth/') ||
        req.path.startsWith('/api/') ||
        req.path.startsWith('/listings') ||
        req.path.startsWith('/favourites')
    ) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.render('auth/error-404', { layout: "layout/layout-without-nav", title: '404 Not Found' });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
