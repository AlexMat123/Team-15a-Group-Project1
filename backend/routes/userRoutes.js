const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorize('admin', 'team_leader'), getUsers)
  .post(authorize('admin', 'team_leader'), createUser);

router
  .route('/:id')
  .get(authorize('admin', 'team_leader'), getUserById)
  .put(authorize('admin', 'team_leader'), updateUser)
  .delete(authorize('admin', 'team_leader'), deleteUser);

router.put('/:id/reset-password', authorize('admin', 'team_leader'), resetUserPassword);

module.exports = router;
