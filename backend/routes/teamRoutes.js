const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const Report = require('../models/Report');
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendTeamAssignmentEmail, sendTeamRemovalEmail } = require('../services/emailService');

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

    // Send team assignment emails to newly added members
    if (newIds.length > 0) {
      const newMembers = await User.find({ _id: { $in: newIds } }).select('email role').lean();
      const loginUrl = `${process.env.FRONTEND_URL}/login`;

      for (const member of newMembers) {
        try {
          await sendTeamAssignmentEmail({
            to: member.email,
            teamName: team.name,
            role: member.role,
            loginUrl,
          });
        } catch (emailErr) {
          console.error(`Failed to send team assignment email to ${member.email}:`, emailErr.message);
        }
      }
    }

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

    // Get the removed user's email before removing them
    const removedUser = await User.findById(req.params.userId).select('email').lean();

    team.members = team.members.filter(m => m.toString() !== req.params.userId);
    await team.save();

    // Send removal email
    if (removedUser) {
      try {
        await sendTeamRemovalEmail({ to: removedUser.email, teamName: team.name });
      } catch (emailErr) {
        console.error(`Failed to send team removal email to ${removedUser.email}:`, emailErr.message);
      }
    }

    const updated = await Team.findById(team._id)
      .populate('members', 'name email role')
      .populate('teamLead', 'name email')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teams/my-team/stats — team lead gets team-specific stats
router.get('/my-team/stats', protect, authorize('team_leader'), async (req, res) => {
  try {
    const team = await Team.findOne({ teamLead: req.user._id });
    if (!team) {
      return res.status(403).json({ message: 'You are not a team lead' });
    }

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
