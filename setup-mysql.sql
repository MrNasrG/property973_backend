-- MySQL Database Setup for Fadmin Project
-- Run this file to create the database

-- Create database
CREATE DATABASE IF NOT EXISTS creator_web CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE creator_web;

-- The users table will be automatically created by Sequelize when you run the application
-- But if you want to create it manually, you can use this:

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    passwordResetToken VARCHAR(255) DEFAULT NULL,
    passwordResetExpires DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create an index on email for faster lookups
CREATE INDEX idx_email ON users(email);

-- Optional: Insert a test user (password is 'password123' hashed with bcrypt)
-- INSERT INTO users (name, email, password, created_at, updated_at) 
-- VALUES ('Test User', 'test@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYK4H5C9lDG', NOW(), NOW());

