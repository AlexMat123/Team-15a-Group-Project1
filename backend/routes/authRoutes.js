const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  changePassword,
  updateProfile,
  updatePreferences,
  getPreferences,
  exportUserData,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);

router.get('/me', protect, getMe);

router.put('/change-password', protect, changePassword);

router.put('/profile', protect, updateProfile);

router.get('/preferences', protect, getPreferences);

router.put('/preferences', protect, updatePreferences);

router.get('/export', protect, exportUserData);

router.delete('/account', protect, deleteAccount);

module.exports = router;
