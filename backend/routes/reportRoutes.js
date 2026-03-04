const express = require('express');
const router = express.Router();
const {
  uploadReport,
  getReports,
  getReportById,
  deleteReport,
  getReportStats,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/stats', getReportStats);

router
  .route('/')
  .get(getReports)
  .post(upload.single('pdf'), handleUploadError, uploadReport);

router
  .route('/:id')
  .get(getReportById)
  .delete(deleteReport);

module.exports = router;
