# Hostinger Deployment Guide

## Issues Fixed
1. **dependencies/devDependencies swapped** - Express, mysql2, sequelize, bcryptjs etc. were in devDependencies. Hostinger runs `npm install --production` and skips devDependencies, so the server never had its packages.
2. **`start` script used nodemon** - Hostinger needs `node app.js` not `nodemon` in production.
3. **Missing `routes/routes.js`** - File was missing from zip but required by app.js.
4. **Missing `utils/email.js`** - File was missing but required by AuthController.
5. **Bug in forgotpassword controller** - `user` variable was not accessible in catch block.
6. **Windows CRLF line endings** - All files had `\r\n` which can cause issues on Linux servers.
7. **PORT hardcoded** - Now uses `process.env.PORT` with fallback (Hostinger injects its own PORT).

## Deployment Steps

### Step 1: Update Database Credentials
Edit `.env` file with your Hostinger MySQL details from hPanel:
```
DB_NAME=your_hostinger_db_name
DB_USER=your_hostinger_db_user  
DB_PASSWORD=your_hostinger_db_password
DB_HOST=localhost
```

### Step 2: Upload to Hostinger
- Upload ALL files EXCEPT `node_modules/` folder
- Hostinger will auto-run `npm install` on deploy

### Step 3: Set Entry Point
In Hostinger hPanel > Node.js > Set entry point to: `app.js`

### Step 4: Create MySQL Database
- In hPanel, go to Databases > MySQL Databases
- Create a new database and user
- Import `setup-mysql.sql` via phpMyAdmin

### Step 5: Start Application
Click "Restart" in Hostinger Node.js panel.
