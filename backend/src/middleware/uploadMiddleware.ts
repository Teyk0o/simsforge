import multer from 'multer';

/**
 * Configure multer for file uploads.
 * Stores files in memory and validates during controller processing.
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (_req, file, cb) => {
    // Basic validation - more detailed validation in services
    if (!file.originalname) {
      cb(new Error('File name is required'));
      return;
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload;
