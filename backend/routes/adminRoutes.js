const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Report = require('../models/Report');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/authMiddleware');
const TrainingExample = require('../models/TrainingExample');
const { buildTrainingExamplesFromLabeledReports } = require('../services/trainingService');


// GET /api/admin/stats
router.get('/stats', protect, authorize('admin'), async (req, res) => {

  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalReports = await Report.countDocuments();

    const reports = await Report.find();

    const totalErrors = reports.reduce((sum, r) => sum + (r.errorCount || 0), 0);
    const totalTimeSaved = reports.reduce((sum, r) => sum + (r.timeSaved || 0), 0);

    const errorBreakdown = [
      { name: 'Placeholder', value: reports.reduce((sum, r) => sum + (r.errorSummary?.placeholder || 0), 0) },
      { name: 'Consistency', value: reports.reduce((sum, r) => sum + (r.errorSummary?.consistency || 0), 0) },
      { name: 'Compliance', value: reports.reduce((sum, r) => sum + (r.errorSummary?.compliance || 0), 0) },
      { name: 'Formatting', value: reports.reduce((sum, r) => sum + (r.errorSummary?.formatting || 0), 0) },
      { name: 'Missing Data', value: reports.reduce((sum, r) => sum + (r.errorSummary?.missing_data || 0), 0) },
    ];

    const manualTime = parseFloat((totalTimeSaved / 0.16).toFixed(1)); // ~84% time saved ratio
    const timeSavedPercent = manualTime > 0 ? Math.round((totalTimeSaved / manualTime) * 100) : 0;

    res.json({
      totalUsers,
      totalReports,
      totalErrors,
      timeSaved: Math.round(totalTimeSaved),
      manualTime,
      aiTime: Math.round(manualTime - totalTimeSaved),
      timeSavedPercent,
      errorBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .populate('reportsCount')
      .lean({ virtuals: true });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports
router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('analyzedBy', 'name email')
      .sort({ analyzedAt: -1 })
      .lean();

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    // Prevent deleting another admin
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete an admin account' });
    }

    // Also delete all reports belonging to this user
    await Report.deleteMany({ analyzedBy: req.params.id });

    await user.deleteOne();

    res.json({ message: 'User and their reports deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/reports/:id/training
router.patch('/reports/:id/training', protect, authorize('admin'), async (req, res) => {
  try {
    const { trainingLabel } = req.body;

    if (!['good', 'bad'].includes(trainingLabel)) {
      return res.status(400).json({ message: 'trainingLabel must be "good" or "bad"' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { addedToTraining: true, trainingLabel },
      { new: true }
    );

    if (!report) return res.status(404).json({ message: 'Report not found' });

    res.json({ message: 'Report added to training', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/training/sync
router.post('/training/sync', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await buildTrainingExamplesFromLabeledReports();
    const stats = await TrainingExample.getTrainingStats();

    res.json({
      message: 'Training examples synced from labeled reports',
      result,
      stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/training/stats
router.get('/training/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await TrainingExample.getTrainingStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot modify an admin account' });

    // Toggle between active and inactive
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();

    res.json({ message: `User ${user.status}`, status: user.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/teams
router.get('/teams', protect, authorize('admin'), async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/teams
router.post('/teams', protect, authorize('admin'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const existing = await Team.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'A team with that name already exists' });
    }

    const team = await Team.create({
      name: name.trim(),
      createdBy: req.user._id,
    });

    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/teams/:id/members
router.patch('/teams/:id/members', protect, authorize('admin'), async (req, res) => {
  try {
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'memberIds must be an array' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Merge new members with existing, avoiding duplicates
    const existingIds = team.members.map(id => id.toString());
    const newIds = memberIds.filter(id => !existingIds.includes(id));
    team.members.push(...newIds);
    await team.save();

    const updated = await Team.findById(team._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/teams/:id/members/:userId
router.delete('/teams/:id/members/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    team.members = team.members.filter(m => m.toString() !== req.params.userId);

    // Clear teamLead if the removed member was the lead and revert their role
    if (team.teamLead && team.teamLead.toString() === req.params.userId) {
      await User.findByIdAndUpdate(req.params.userId, { role: 'user' });
      team.teamLead = null;
    }

    await team.save();

    const updated = await Team.findById(team._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/teams/:id/lead
router.patch('/teams/:id/lead', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (!team.members.map(m => m.toString()).includes(userId)) {
      return res.status(400).json({ message: 'User must be a member of the team' });
    }

    // Revert previous lead back to 'user' role
    if (team.teamLead && team.teamLead.toString() !== userId) {
      await User.findByIdAndUpdate(team.teamLead, { role: 'user' });
    }

    // Set new lead's role to 'team_leader'
    await User.findByIdAndUpdate(userId, { role: 'team_leader' });

    team.teamLead = userId;
    await team.save();

    const updated = await Team.findById(team._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/teams/:id
router.delete('/teams/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Revert team lead role back to 'user'
    if (team.teamLead) {
      await User.findByIdAndUpdate(team.teamLead, { role: 'user' });
    }

    await team.deleteOne();

    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/teams/:id/stats
router.get('/teams/:id/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const memberIds = team.members.map(m => m.toString());
    const reports = await Report.find({ analyzedBy: { $in: memberIds } });

    const totalReports = reports.length;
    const totalErrors = reports.reduce((sum, r) => sum + (r.errorCount || 0), 0);
    const totalTimeSaved = reports.reduce((sum, r) => sum + (r.timeSaved || 0), 0);

    const errorBreakdown = [
      { name: 'Placeholder', value: reports.reduce((sum, r) => sum + (r.errorSummary?.placeholder || 0), 0) },
      { name: 'Consistency', value: reports.reduce((sum, r) => sum + (r.errorSummary?.consistency || 0), 0) },
      { name: 'Compliance', value: reports.reduce((sum, r) => sum + (r.errorSummary?.compliance || 0), 0) },
      { name: 'Formatting', value: reports.reduce((sum, r) => sum + (r.errorSummary?.formatting || 0), 0) },
      { name: 'Missing Data', value: reports.reduce((sum, r) => sum + (r.errorSummary?.missing_data || 0), 0) },
    ];

    const manualTime = parseFloat((totalTimeSaved / 0.16).toFixed(1));
    const timeSavedPercent = manualTime > 0 ? Math.round((totalTimeSaved / manualTime) * 100) : 0;

    res.json({
      totalMembers: memberIds.length,
      totalReports,
      totalErrors,
      timeSaved: Math.round(totalTimeSaved),
      manualTime,
      aiTime: Math.round(manualTime - totalTimeSaved),
      timeSavedPercent,
      errorBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
