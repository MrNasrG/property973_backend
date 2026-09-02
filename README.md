# Node.js App — Hostinger Deployment Guide

## Prerequisites
- Node.js >= 16
- MySQL database created in Hostinger hPanel

---

## Step 1 — Configure Database

Edit `config.env` and fill in your Hostinger MySQL credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456_yourdb        ← from hPanel
DB_USER=u123456_youruser      ← from hPanel
DB_PASSWORD=your_password     ← from hPanel
```

Also set strong secrets:
```
SESSION_SECRET=some_long_random_string
JWT_ACCESS_SECRET=another_long_random_string
JWT_REFRESH_SECRET=yet_another_random_string
```

For OTP, welcome, and forgot-password emails (Hostinger SMTP from **hPanel → Emails → Manage → Connect Apps & Devices**):
```
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_SECURE=0
EMAIL_USERNAME=hello@yourdomain.com
EMAIL_PASSWORD=your_email_account_password
EMAIL_FROM=hello@yourdomain.com
EMAIL_FORGET_PSWD_SUBJECT=Reset your password
EMAIL_OTP_SUBJECT=Your verification code
EMAIL_WELCOME_SUBJECT=Welcome
EMAIL_LOG_LINK=1
APP_PUBLIC_URL=https://yourdomain.com
PASSWORD_RESET_RETURN_TOKEN_IN_RESPONSE=1
```

Dev: `GET /api/email/status` and `POST /api/email/test` with `{ "email": "..." }` to verify SMTP.

**Auth APIs**

| Method | Path | Body |
|--------|------|------|
| POST | `/auth/register` | `{ "fullName", "mobileNumber", "email", "password" }` — OTP emailed |
| POST | `/auth/otp/send` | `{ "fullName", "mobileNumber", "password" }` — OTP emailed |
| POST | `/auth/otp/verify` | `{ "mobileNumber", "otp" }` |
| POST | `/auth/forgot-password` | `{ "email" }` reset link **or** `{ "mobileNumber" }` OTP emailed |
| POST | `/auth/forgot-password/verify-otp` | `{ "mobileNumber", "otp" }` → `resetToken` |
| GET | `/auth/reset-password/verify?resetToken=...` | — |
| POST | `/auth/reset-password` | `{ "resetToken", "password", "confirmPassword" }` |

Set `OTP_HIDE_FROM_RESPONSE=1` in production. Set `PASSWORD_RESET_RETURN_TOKEN_IN_RESPONSE=1` in dev to receive `data.resetToken` from email forgot-password.

---

## Step 2 — Install Dependencies

```bash
npm install
```

---

## Step 3 — Run Database Migrations

Creates all tables (users, verify_otp, etc.):

```bash
npm run db:migrate
```

Seed the default admin user (`admin@admin.com` / `Admin@123`):

```bash
npm run db:seed
```

---

## Step 4 — Start the App

```bash
# Direct start
npm start

# Recommended: use PM2 to keep it running
npm install -g pm2
pm2 start app.js --name "nodejs-app"
pm2 save
pm2 startup
```

---

## Available npm Scripts

| Command | Description |
|---|---|
| `npm start` | Start the app |
| `npm run db:migrate` | Run all pending migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:seed` | Seed admin user |
| `npm run db:seed:undo` | Remove seeded data |

---

## Default Admin Login
- **URL:** `/login`
- **Email:** `admin@admin.com`
- **Password:** `Admin@123`

> Change the password after first login!

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Access denied for user` | Check DB_USER / DB_PASSWORD in config.env |
| `Unknown database` | Create the DB in hPanel first |
| `ECONNREFUSED` | Try `DB_HOST=127.0.0.1` instead of `localhost` |
| Migrations fail | Run `npm run db:migrate:undo` then retry |
