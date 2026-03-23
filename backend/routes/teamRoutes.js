const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

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

// GET /api/teams/available-users — get non-admin users for adding to team
router.get('/available-users', protect, authorize('team_leader'), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('name email role')
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/teams/my-team/members — team lead adds members
router.patch('/my-team/members', protect, authorize('team_leader'), async (req, res) => {
  try {
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'memberIds must be an array' });
    }

    const team = await Team.findOne({ teamLead: req.user._id });
    if (!team) {
      return res.status(403).json({ message: 'You are not a team lead' });
    }

    const existingIds = team.members.map(id => id.toString());
    const newIds = memberIds.filter(id => !existingIds.includes(id));
    team.members.push(...newIds);
    await team.save();

    const updated = await Team.findById(team._id)
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teams/my-team/members/:userId — team lead removes a member
router.delete('/my-team/members/:userId', protect, authorize('team_leader'), async (req, res) => {
  try {
    const team = await Team.findOne({ teamLead: req.user._id });
    if (!team) {
      return res.status(403).json({ message: 'You are not a team lead' });
    }

    // Prevent team lead from removing themselves
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot remove yourself from the team' });
    }

    team.members = team.members.filter(m => m.toString() !== req.params.userId);
    await team.save();

    const updated = await Team.findById(team._id)
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
