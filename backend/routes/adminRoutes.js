const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Report = require('../models/Report');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/authMiddleware');
const { trainingUpload, handleUploadError } = require('../middleware/uploadMiddleware');
const TrainingExample = require('../models/TrainingExample');
const { buildTrainingExamplesFromLabeledReports, processTrainingExample } = require('../services/trainingService');
const { sendTeamAssignmentEmail, sendTeamLeadAssignmentEmail, sendTeamRemovalEmail } = require('../services/emailService');


// GET /api/admin/stats?range=7d|30d|90d|all&team=teamId&user=userId&result=good|bad|uncertain
router.get('/stats', protect, authorize('admin'), async (req, res) => {

  try {
    const { range, team, user: userId, result } = req.query;
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    // Build report query filter
    const filter = {};

    // Date range filter
    if (range && range !== 'all') {
      const days = parseInt(range);
      if (!isNaN(days) && days > 0) {
        filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
      }
    }

    // Team filter — only include reports from members of the selected team
    if (team) {
      const teamDoc = await Team.findById(team);
      if (teamDoc) {
        const memberIds = teamDoc.members.map(m => m.toString());
        filter.analyzedBy = { $in: memberIds };
      }
    }

    // User filter
    if (userId) {
      filter.analyzedBy = userId;
    }

    // Result filter
    if (result) {
      filter['qualityAssessment.label'] = result;
    }

    const reports = await Report.find(filter);

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

    // Quality assessment counts
    const passed = reports.filter(r => r.qualityAssessment?.label === 'good').length;
    const failed = reports.filter(r => r.qualityAssessment?.label === 'bad').length;
    const uncertain = reports.filter(r => r.qualityAssessment?.label === 'uncertain').length;

    res.json({
      totalUsers,
      totalReports,
      totalErrors,
      timeSaved: Math.round(totalTimeSaved),
      manualTime,
      aiTime: Math.round(manualTime - totalTimeSaved),
      timeSavedPercent,
      errorBreakdown,
      qualityBreakdown: { passed, failed, uncertain },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics?level=company|team|user&teamId=xxx&userId=xxx&range=7|30|90|all
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const { level = 'company', teamId, userId, range = '30' } = req.query;

    const filter = {};
    let scopeLabel = 'Company-wide';
    let scopeDetails = null;

    if (range && range !== 'all') {
      const days = parseInt(range);
      if (!isNaN(days) && days > 0) {
        filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
      }
    }

    if (level === 'team' && teamId) {
      const team = await Team.findById(teamId).populate('members', 'name email').lean();
      if (team) {
        const memberIds = team.members.map((m) => m._id);
        filter.analyzedBy = { $in: memberIds };
        scopeLabel = `Team: ${team.name}`;
        scopeDetails = { teamId: team._id, teamName: team.name, memberCount: team.members.length };
      }
    } else if (level === 'user' && userId) {
      const targetUser = await User.findById(userId).select('name email role').lean();
      if (targetUser) {
        filter.analyzedBy = userId;
        scopeLabel = `User: ${targetUser.name}`;
        scopeDetails = { userId: targetUser._id, userName: targetUser.name, userEmail: targetUser.email, userRole: targetUser.role };
      }
    }

    const reports = await Report.find(filter)
      .select('filename status errorCount errorSummary timeSaved qualityAssessment createdAt analyzedBy errors')
      .populate('analyzedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const summary = {
      totalReports: reports.length,
      analyzedReports: 0,
      pendingReports: 0,
      failedReports: 0,
      totalErrors: 0,
      averageErrorsPerReport: 0,
      totalTimeSaved: 0,
    };

    const errorBreakdown = {
      placeholder: 0,
      consistency: 0,
      compliance: 0,
      formatting: 0,
      missing_data: 0,
    };

    const qualityBreakdown = { good: 0, bad: 0, uncertain: 0 };
    const checklistFailureCounts = new Map();

    const now = new Date();
    const days = range === 'all' ? 365 : parseInt(range) || 30;
    const bucketCount = Math.min(days, 12);
    const bucketSizeDays = Math.ceil(days / bucketCount);

    const trendBuckets = new Map();
    for (let i = 0; i < bucketCount; i++) {
      const bucketEnd = new Date(now.getTime() - i * bucketSizeDays * 24 * 60 * 60 * 1000);
      const bucketStart = new Date(bucketEnd.getTime() - bucketSizeDays * 24 * 60 * 60 * 1000);
      const key = bucketEnd.toISOString().slice(0, 10);
      trendBuckets.set(key, {
        periodLabel: bucketEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        periodStart: bucketStart,
        periodEnd: bucketEnd,
        reportCount: 0,
        errorCount: 0,
        passedCount: 0,
        failedCount: 0,
      });
    }

    const userStats = new Map();

    reports.forEach((report) => {
      summary.totalErrors += report.errorCount || 0;
      summary.totalTimeSaved += report.timeSaved || 0;

      if (report.status === 'analyzed') {
        summary.analyzedReports += 1;
      } else if (report.status === 'failed') {
        summary.failedReports += 1;
      } else {
        summary.pendingReports += 1;
      }

      errorBreakdown.placeholder += report.errorSummary?.placeholder || 0;
      errorBreakdown.consistency += report.errorSummary?.consistency || 0;
      errorBreakdown.compliance += report.errorSummary?.compliance || 0;
      errorBreakdown.formatting += report.errorSummary?.formatting || 0;
      errorBreakdown.missing_data += report.errorSummary?.missing_data || 0;

      const qualityLabel = report.qualityAssessment?.label;
      if (qualityLabel && qualityBreakdown[qualityLabel] !== undefined) {
        qualityBreakdown[qualityLabel] += 1;
      }

      (report.errors || []).forEach((error) => {
        if (error?.message) {
          const count = checklistFailureCounts.get(error.message) || 0;
          checklistFailureCounts.set(error.message, count + 1);
        }
      });

      const createdAt = new Date(report.createdAt);
      for (const [key, bucket] of trendBuckets.entries()) {
        if (createdAt <= bucket.periodEnd && createdAt > bucket.periodStart) {
          bucket.reportCount += 1;
          bucket.errorCount += report.errorCount || 0;
          if (report.qualityAssessment?.label === 'good') bucket.passedCount += 1;
          if (report.qualityAssessment?.label === 'bad') bucket.failedCount += 1;
          break;
        }
      }

      if (report.analyzedBy) {
        const odId = report.analyzedBy._id?.toString() || report.analyzedBy.toString();
        if (!userStats.has(odId)) {
          userStats.set(odId, {
            odId,
            userName: report.analyzedBy.name || 'Unknown',
            userEmail: report.analyzedBy.email || '',
            reportCount: 0,
            errorCount: 0,
            passedCount: 0,
            failedCount: 0,
          });
        }
        const us = userStats.get(odId);
        us.reportCount += 1;
        us.errorCount += report.errorCount || 0;
        if (report.qualityAssessment?.label === 'good') us.passedCount += 1;
        if (report.qualityAssessment?.label === 'bad') us.failedCount += 1;
      }
    });

    if (summary.analyzedReports > 0) {
      summary.averageErrorsPerReport = Number((summary.totalErrors / summary.analyzedReports).toFixed(2));
    }

    const passRate = summary.analyzedReports > 0
      ? Number(((qualityBreakdown.good / summary.analyzedReports) * 100).toFixed(1))
      : 0;

    const manualTime = parseFloat((summary.totalTimeSaved / 0.16).toFixed(1));
    const timeSavedPercent = manualTime > 0 ? Math.round((summary.totalTimeSaved / manualTime) * 100) : 0;

    const errorBreakdownArray = [
      { name: 'Placeholder', value: errorBreakdown.placeholder },
      { name: 'Consistency', value: errorBreakdown.consistency },
      { name: 'Compliance', value: errorBreakdown.compliance },
      { name: 'Formatting', value: errorBreakdown.formatting },
      { name: 'Missing Data', value: errorBreakdown.missing_data },
    ];

    const topErrors = Array.from(checklistFailureCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const trendData = Array.from(trendBuckets.values())
      .reverse()
      .map((bucket) => ({
        period: bucket.periodLabel,
        reports: bucket.reportCount,
        errors: bucket.errorCount,
        passed: bucket.passedCount,
        failed: bucket.failedCount,
        passRate: bucket.reportCount > 0 ? Number(((bucket.passedCount / bucket.reportCount) * 100).toFixed(1)) : 0,
      }));

    const userLeaderboard = Array.from(userStats.values())
      .map((us) => ({
        ...us,
        passRate: us.reportCount > 0 ? Number(((us.passedCount / us.reportCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, 10);

    const recentReports = reports.slice(0, 10).map((r) => ({
      _id: r._id,
      filename: r.filename,
      status: r.status,
      errorCount: r.errorCount || 0,
      qualityLabel: r.qualityAssessment?.label || null,
      analyzedBy: r.analyzedBy?.name || 'Unknown',
      createdAt: r.createdAt,
    }));

    res.json({
      level,
      range,
      scopeLabel,
      scopeDetails,
      summary: {
        ...summary,
        passRate,
        manualTime,
        aiTime: Math.round(manualTime - summary.totalTimeSaved),
        timeSavedPercent,
      },
      errorBreakdown: errorBreakdownArray,
      qualityBreakdown,
      trendData,
      topErrors,
      userLeaderboard,
      recentReports,
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

// POST /api/admin/training/upload
router.post(
  '/training/upload',
  protect,
  authorize('admin'),
  trainingUpload.single('pdf'),
  handleUploadError,
  async (req, res) => {
    try {
      const { type } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'No PDF file uploaded' });
      }

      if (!['good', 'bad', 'template'].includes(type)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Type must be "good", "bad", or "template"' });
      }

      const trainingExample = await TrainingExample.create({
        filename: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        type,
        status: 'pending',
        uploadedBy: req.user._id,
      });

      processTrainingExample(trainingExample._id).catch((err) => {
        console.error('Background training processing failed:', err.message);
      });

      res.status(201).json({
        message: 'Training example uploaded successfully',
        example: trainingExample,
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/admin/training/examples
router.get('/training/examples', protect, authorize('admin'), async (req, res) => {
  try {
    const examples = await TrainingExample.find()
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(examples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/training/examples/:id
router.delete('/training/examples/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const example = await TrainingExample.findById(req.params.id);

    if (!example) {
      return res.status(404).json({ message: 'Training example not found' });
    }

    if (example.filePath && fs.existsSync(example.filePath)) {
      fs.unlinkSync(example.filePath);
    }

    await example.deleteOne();

    res.json({ message: 'Training example deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/training/examples/:id/activate — set a template as the active one
router.patch('/training/examples/:id/activate', protect, authorize('admin'), async (req, res) => {
  try {
    const example = await TrainingExample.findById(req.params.id);
    if (!example) return res.status(404).json({ message: 'Training example not found' });
    if (example.type !== 'template') {
      return res.status(400).json({ message: 'Only template examples can be activated' });
    }
    if (example.status !== 'trained') {
      return res.status(400).json({ message: 'Template must be trained before activating' });
    }

    // Deactivate any currently active template
    await TrainingExample.updateMany({ type: 'template', isActive: true }, { isActive: false });

    example.isActive = true;
    await example.save();

    res.json({ message: 'Template activated', example });
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
    const now = new Date();
    newIds.forEach(id => {
      team.members.push(id);
      team.memberJoinDates.set(id, now);
    });
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

    // Get the removed user's email before removing them
    const removedUser = await User.findById(req.params.userId).select('email').lean();

    team.members = team.members.filter(m => m.toString() !== req.params.userId);
    team.memberJoinDates.delete(req.params.userId);

    // Clear teamLead if the removed member was the lead and revert their role
    if (team.teamLead && team.teamLead.toString() === req.params.userId) {
      await User.findByIdAndUpdate(req.params.userId, { role: 'user' });
      team.teamLead = null;
    }

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

    // Send email notifying the new team lead
    try {
      const leadUser = await User.findById(userId).select('email').lean();
      await sendTeamLeadAssignmentEmail({
        to: leadUser.email,
        teamName: team.name,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      });
    } catch (emailErr) {
      console.error(`Failed to send team lead assignment email:`, emailErr.message);
    }

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

// GET /api/admin/teams/:id/stats?range=7|30|90|all&user=userId&result=good|bad|uncertain
router.get('/teams/:id/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { range, user: userId, result } = req.query;

    const team = await Team.findById(req.params.id)
      .populate('members', 'name email')
      .populate('teamLead', 'name email');
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const memberIds = team.members.map(m => (typeof m === 'object' ? m._id.toString() : m.toString()));

    // Build query filter
    const filter = { analyzedBy: userId ? userId : { $in: memberIds } };

    // Date range filter
    if (range && range !== 'all') {
      const days = parseInt(range);
      if (!isNaN(days) && days > 0) {
        filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
      }
    }

    // Result filter
    if (result) {
      filter['qualityAssessment.label'] = result;
    }

    const allMemberReports = await Report.find(filter)
      .populate('analyzedBy', 'name email')
      .sort({ createdAt: -1 });

    // Only include reports created after the member joined this team
    const reports = allMemberReports.filter(r => {
      const rUserId = typeof r.analyzedBy === 'object' ? r.analyzedBy._id.toString() : r.analyzedBy.toString();
      const joinDate = team.memberJoinDates?.get(rUserId);
      // If no join date recorded (legacy member), include all their reports
      if (!joinDate) return true;
      return new Date(r.createdAt) >= new Date(joinDate);
    });

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

    // Quality assessment breakdown
    const passed = reports.filter(r => r.qualityAssessment?.label === 'good').length;
    const failed = reports.filter(r => r.qualityAssessment?.label === 'bad').length;
    const uncertain = reports.filter(r => r.qualityAssessment?.label === 'uncertain').length;
    const pending = reports.filter(r => r.status === 'pending' || r.status === 'processing').length;

    // Per-member breakdown (filtered by join date per member)
    const memberBreakdown = team.members.map(member => {
      const mId = typeof member === 'object' ? member._id.toString() : member.toString();
      const memberReports = reports.filter(r => {
        const rId = typeof r.analyzedBy === 'object' ? r.analyzedBy._id.toString() : r.analyzedBy.toString();
        return rId === mId;
      });
      return {
        _id: mId,
        name: typeof member === 'object' ? member.name : 'Unknown',
        email: typeof member === 'object' ? member.email : '',
        reportsCount: memberReports.length,
        errorsFound: memberReports.reduce((sum, r) => sum + (r.errorCount || 0), 0),
        passed: memberReports.filter(r => r.qualityAssessment?.label === 'good').length,
        failed: memberReports.filter(r => r.qualityAssessment?.label === 'bad').length,
      };
    });

    // Recent reports (last 10)
    const recentReports = reports.slice(0, 10).map(r => ({
      _id: r._id,
      filename: r.filename,
      analyzedBy: r.analyzedBy?.name || 'Unknown',
      status: r.status,
      errorCount: r.errorCount || 0,
      result: r.qualityAssessment?.label || null,
      createdAt: r.createdAt,
    }));

    res.json({
      totalMembers: memberIds.length,
      totalReports,
      totalErrors,
      timeSaved: Math.round(totalTimeSaved),
      manualTime,
      aiTime: Math.round(manualTime - totalTimeSaved),
      timeSavedPercent,
      errorBreakdown,
      qualityBreakdown: { passed, failed, uncertain, pending },
      memberBreakdown,
      recentReports,
      teamLead: team.teamLead ? { name: team.teamLead.name, email: team.teamLead.email } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id/profile-analytics?scope=week|month|all
router.get('/users/:id/profile-analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId).select('name email');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const scope = ['week', 'month', 'all'].includes(req.query.scope) ? req.query.scope : 'all';

    // Build date filter
    const reportQuery = { analyzedBy: userId };
    let startDate = null;
    if (scope === 'week') {
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);
    } else if (scope === 'month') {
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 29);
      startDate.setUTCHours(0, 0, 0, 0);
    }
    if (startDate) reportQuery.createdAt = { $gte: startDate };

    const reports = await Report.find(reportQuery)
      .select('filename status errorCount errorSummary timeSaved qualityAssessment createdAt errors')
      .sort({ createdAt: -1 })
      .lean();

    const summary = {
      totalReports: reports.length,
      analyzedReports: 0,
      pendingReports: 0,
      failedReports: 0,
      totalErrors: 0,
      averageErrorsPerReport: 0,
      totalTimeSaved: 0,
    };

    const errorBreakdown = { placeholder: 0, consistency: 0, compliance: 0, formatting: 0, missing_data: 0 };
    const qualityBreakdown = { good: 0, bad: 0, uncertain: 0 };
    const errorTypesByReport = { placeholder: 0, consistency: 0, compliance: 0, formatting: 0, missing_data: 0 };
    const checklistFailureCounts = new Map();

    reports.forEach((report) => {
      summary.totalErrors += report.errorCount || 0;
      summary.totalTimeSaved += report.timeSaved || 0;

      if (report.status === 'analyzed') summary.analyzedReports += 1;
      else if (report.status === 'failed') summary.failedReports += 1;
      else if (['pending', 'processing'].includes(report.status)) summary.pendingReports += 1;

      errorBreakdown.placeholder += report.errorSummary?.placeholder || 0;
      errorBreakdown.consistency += report.errorSummary?.consistency || 0;
      errorBreakdown.compliance += report.errorSummary?.compliance || 0;
      errorBreakdown.formatting += report.errorSummary?.formatting || 0;
      errorBreakdown.missing_data += report.errorSummary?.missing_data || 0;

      if ((report.errorSummary?.placeholder || 0) > 0) errorTypesByReport.placeholder += 1;
      if ((report.errorSummary?.consistency || 0) > 0) errorTypesByReport.consistency += 1;
      if ((report.errorSummary?.compliance || 0) > 0) errorTypesByReport.compliance += 1;
      if ((report.errorSummary?.formatting || 0) > 0) errorTypesByReport.formatting += 1;
      if ((report.errorSummary?.missing_data || 0) > 0) errorTypesByReport.missing_data += 1;

      const qualityLabel = report.qualityAssessment?.label;
      if (qualityLabel && qualityBreakdown[qualityLabel] !== undefined) qualityBreakdown[qualityLabel] += 1;

      (report.errors || []).forEach((error) => {
        if (!error?.message) return;
        checklistFailureCounts.set(error.message, (checklistFailureCounts.get(error.message) || 0) + 1);
      });
    });

    if (summary.analyzedReports > 0) {
      summary.averageErrorsPerReport = Number((summary.totalErrors / summary.analyzedReports).toFixed(2));
    }

    const mostCommonErrorTypes = Object.entries(errorBreakdown)
      .map(([type, count]) => ({ type, count, reportsAffected: errorTypesByReport[type] || 0 }))
      .sort((a, b) => b.count !== a.count ? b.count - a.count : b.reportsAffected - a.reportsAffected);

    const checklistFailureBreakdown = Array.from(checklistFailureCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const qualityScoreTrend = reports
      .filter((r) => r.status === 'analyzed')
      .map((r) => ({
        _id: r._id,
        filename: r.filename,
        createdAt: r.createdAt,
        qualityLabel: r.qualityAssessment?.label || null,
        qualityScore: Number(((r.qualityAssessment?.goodScore || 0) * 100).toFixed(1)),
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-10);

    const recentReports = reports.slice(0, 5).map((r) => ({
      _id: r._id,
      filename: r.filename,
      createdAt: r.createdAt,
      status: r.status,
      errorCount: r.errorCount || 0,
      timeSaved: r.timeSaved || 0,
      qualityLabel: r.qualityAssessment?.label || null,
      errorSummary: {
        placeholder: r.errorSummary?.placeholder || 0,
        consistency: r.errorSummary?.consistency || 0,
        compliance: r.errorSummary?.compliance || 0,
        formatting: r.errorSummary?.formatting || 0,
        missing_data: r.errorSummary?.missing_data || 0,
      },
    }));

    res.json({
      user: { name: targetUser.name, email: targetUser.email },
      scope,
      summary,
      errorBreakdown,
      qualityBreakdown,
      mostCommonErrorTypes,
      checklistFailureBreakdown,
      qualityScoreTrend,
      recentReports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
