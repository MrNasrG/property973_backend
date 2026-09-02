const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const ALLOWED_MIME_TYPES = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const MIME_TO_EXT = Object.freeze({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
});

function maxPhotoBytes() {
    const raw = parseInt(process.env.LISTING_PHOTO_MAX_BYTES || '5242880', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 5242880;
}

function uploadsRoot() {
    return process.env.LISTING_PHOTO_UPLOAD_DIR
        || path.join(__dirname, '..', 'public', 'uploads', 'listings');
}

function publicBaseUrl(req) {
    if (process.env.LISTING_PHOTO_PUBLIC_BASE_URL) {
        return process.env.LISTING_PHOTO_PUBLIC_BASE_URL.replace(/\/$/, '');
    }
    if (req) {
        return `${req.protocol}://${req.get('host')}`;
    }
    const port = process.env.PORT || 3000;
    return (process.env.APP_PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, '');
}

function buildPhotoUrl(req, relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    return `${publicBaseUrl(req)}/uploads/listings/${normalized}`;
}

async function saveListingPhotos(files, listingId, req, startOrder = 0) {
    if (!files || !files.length) return [];

    const listingDir = path.join(uploadsRoot(), listingId);
    await fs.ensureDir(listingDir);

    const saved = [];
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const ext = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname) || '.jpg';
        const filename = `${crypto.randomUUID()}${ext}`;
        const storagePath = path.join(listingDir, filename);
        const relativePath = path.join(listingId, filename).replace(/\\/g, '/');

        if (file.buffer) {
            await fs.writeFile(storagePath, file.buffer);
        } else if (file.path) {
            await fs.move(file.path, storagePath, { overwrite: true });
        }

        saved.push({
            id: crypto.randomUUID(),
            url: buildPhotoUrl(req, relativePath),
            storage_path: storagePath,
            sort_order: startOrder + i
        });
    }

    return saved;
}

async function deletePhotoFile(storagePath) {
    if (!storagePath) return;
    try {
        await fs.remove(storagePath);
    } catch (err) {
        console.warn('Could not delete photo file:', storagePath, err.message);
    }
}

async function deleteListingPhotoDir(listingId) {
    const listingDir = path.join(uploadsRoot(), listingId);
    try {
        await fs.remove(listingDir);
    } catch (err) {
        console.warn('Could not delete listing photo dir:', listingDir, err.message);
    }
}

module.exports = {
    ALLOWED_MIME_TYPES,
    maxPhotoBytes,
    uploadsRoot,
    buildPhotoUrl,
    saveListingPhotos,
    deletePhotoFile,
    deleteListingPhotoDir
};
