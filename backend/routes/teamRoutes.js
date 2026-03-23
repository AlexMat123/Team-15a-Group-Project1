const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { protect } = require('../middleware/authMiddleware');

// GET /api/teams/my-team — get the logged-in user's team with members
router.get('/my-team', protect, async (req, res) => {
  try {
    const team = await Team.findOne({ members: req.user._id })
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    if (!team) {
      return res.status(404).json({ message: 'You are not part of any team' });
    }

    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
