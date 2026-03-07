const express = require('express');
const router = express.Router();
const {
  uploadReport,
  analyzeReport,
  getReports,
  getReportById,
  deleteReport,
  getReportStats,
  getReportText,
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

router.post('/:id/analyze', analyzeReport);
router.get('/:id/text', getReportText);

module.exports = router;
