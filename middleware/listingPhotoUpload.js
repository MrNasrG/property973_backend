const multer = require('multer');
const { ALLOWED_MIME_TYPES, maxPhotoBytes } = require('../utils/listingPhotoStorage');

const MAX_PHOTOS_PER_LISTING = 20;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: maxPhotoBytes(),
        files: MAX_PHOTOS_PER_LISTING
    },
    fileFilter(req, file, cb) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            const err = new Error('Unsupported image type. Allowed: JPEG, PNG, WEBP.');
            err.code = 'UNSUPPORTED_MEDIA_TYPE';
            return cb(err);
        }
        return cb(null, true);
    }
});

function handleMulterError(err, req, res, next) {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'Photo too large',
            errors: [{ field: 'photos', message: `Each photo must be at most ${maxPhotoBytes()} bytes` }]
        });
    }
    if (err.code === 'UNSUPPORTED_MEDIA_TYPE' || err.message?.includes('Unsupported image type')) {
        return res.status(415).json({
            success: false,
            message: 'Unsupported image type',
            errors: [{ field: 'photos', message: 'Allowed types: image/jpeg, image/png, image/webp' }]
        });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'photos', message: `Maximum ${MAX_PHOTOS_PER_LISTING} photos allowed` }]
        });
    }
    return next(err);
}

const uploadListingPhotos = upload.array('photos', MAX_PHOTOS_PER_LISTING);

module.exports = {
    MAX_PHOTOS_PER_LISTING,
    uploadListingPhotos,
    handleMulterError
};
