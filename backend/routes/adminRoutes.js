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

const getAdminAnalyticsScopeConfig = (range) => {
  const now = new Date();

  if (range === 'all') {
    return {
      range: 'all',
      startDate: null,
      bucketCount: 0,
      getBucketDate: () => null,
      getBucketKey: (date) =>
        `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      formatBucketLabel: (date) =>
        new Intl.DateTimeFormat('en-GB', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(date),
    };
  }

  const parsedDays = parseInt(range, 10);
  const safeDays = !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : 30;
  const startDate = new Date(now);
  startDate.setUTCDate(now.getUTCDate() - (safeDays - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  return {
    range: String(safeDays),
    startDate,
    bucketCount: safeDays,
    getBucketDate: (offset) => {
      const bucketDate = new Date(startDate);
      bucketDate.setUTCDate(startDate.getUTCDate() + offset);
      return bucketDate;
    },
    getBucketKey: (date) => date.toISOString().slice(0, 10),
    formatBucketLabel: (date) =>
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(date),
  };
};

const buildAdminAnalyticsPayload = async ({ filter, scopeLabel, scopeDetails, range }) => {
  const scopeConfig = getAdminAnalyticsScopeConfig(range);
  const reportFilter = { ...filter };

  if (scopeConfig.startDate) {
    reportFilter.createdAt = { $gte: scopeConfig.startDate };
  }

  const reports = await Report.find(reportFilter)
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
  const errorTypesByReport = {
    placeholder: 0,
    consistency: 0,
    compliance: 0,
    formatting: 0,
    missing_data: 0,
  };

  const trendBuckets = new Map();
  const bucketDates = [];

  if (scopeConfig.range === 'all') {
    const now = new Date();
    const oldestReportDate = reports.length
      ? new Date(reports[reports.length - 1].createdAt)
      : now;
    const firstBucketDate = new Date(
      Date.UTC(oldestReportDate.getUTCFullYear(), oldestReportDate.getUTCMonth(), 1)
    );
    const lastBucketDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    for (
      let bucketDate = new Date(firstBucketDate);
      bucketDate <= lastBucketDate;
      bucketDate = new Date(Date.UTC(bucketDate.getUTCFullYear(), bucketDate.getUTCMonth() + 1, 1))
    ) {
      bucketDates.push(bucketDate);
    }
  } else {
    for (let offset = 0; offset < scopeConfig.bucketCount; offset += 1) {
      bucketDates.push(scopeConfig.getBucketDate(offset));
    }
  }

  bucketDates.forEach((bucketDate) => {
    const key = scopeConfig.getBucketKey(bucketDate);
    trendBuckets.set(key, {
      periodKey: key,
      periodLabel: scopeConfig.formatBucketLabel(bucketDate),
      reportCount: 0,
      errorCount: 0,
      analyzedCount: 0,
      passedCount: 0,
      failedCount: 0,
    });
  });

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
    if ((report.errorSummary?.placeholder || 0) > 0) errorTypesByReport.placeholder += 1;
    if ((report.errorSummary?.consistency || 0) > 0) errorTypesByReport.consistency += 1;
    if ((report.errorSummary?.compliance || 0) > 0) errorTypesByReport.compliance += 1;
    if ((report.errorSummary?.formatting || 0) > 0) errorTypesByReport.formatting += 1;
    if ((report.errorSummary?.missing_data || 0) > 0) errorTypesByReport.missing_data += 1;

    const qualityLabel = report.qualityAssessment?.label;
    if (qualityLabel && qualityBreakdown[qualityLabel] !== undefined) {
      qualityBreakdown[qualityLabel] += 1;
    }

    (report.errors || []).forEach((error) => {
      if (error?.message) {
        checklistFailureCounts.set(error.message, (checklistFailureCounts.get(error.message) || 0) + 1);
      }
    });

    const createdAt = new Date(report.createdAt);
    const bucketKey = scopeConfig.getBucketKey(createdAt);
    const existingBucket = trendBuckets.get(bucketKey);
    if (existingBucket) {
      existingBucket.reportCount += 1;
      existingBucket.errorCount += report.errorCount || 0;
      if (report.status === 'analyzed') {
        existingBucket.analyzedCount += 1;
        if (report.qualityAssessment?.label === 'good') existingBucket.passedCount += 1;
        if (report.qualityAssessment?.label === 'bad') existingBucket.failedCount += 1;
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
      const userStat = userStats.get(odId);
      userStat.reportCount += 1;
      userStat.errorCount += report.errorCount || 0;
      if (report.qualityAssessment?.label === 'good') userStat.passedCount += 1;
      if (report.qualityAssessment?.label === 'bad') userStat.failedCount += 1;
    }
  });

  if (summary.analyzedReports > 0) {
    summary.averageErrorsPerReport = Number(
      (summary.totalErrors / summary.analyzedReports).toFixed(2)
    );
  }

  const passRate = summary.analyzedReports > 0
    ? Number(((qualityBreakdown.good / summary.analyzedReports) * 100).toFixed(1))
    : 0;

  const manualTime = parseFloat((summary.totalTimeSaved / 0.16).toFixed(1));
  const timeSavedPercent = manualTime > 0
    ? Math.round((summary.totalTimeSaved / manualTime) * 100)
    : 0;

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

  const checklistFailureBreakdown = Array.from(checklistFailureCounts.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const mostCommonErrorTypes = Object.entries(errorBreakdown)
    .map(([type, count]) => ({
      type,
      count,
      reportsAffected: errorTypesByReport[type] || 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return b.reportsAffected - a.reportsAffected;
    });

  const passFailRateTrends = Array.from(trendBuckets.values()).map((bucket) => ({
    periodKey: bucket.periodKey,
    periodLabel: bucket.periodLabel,
    analyzedCount: bucket.analyzedCount,
    passedCount: bucket.passedCount,
    failedCount: bucket.failedCount,
    passRate:
      bucket.analyzedCount > 0
        ? Number(((bucket.passedCount / bucket.analyzedCount) * 100).toFixed(1))
        : 0,
  }));

  const qualityScoreTrend = reports
    .filter((report) => report.status === 'analyzed')
    .map((report) => ({
      _id: report._id,
      filename: report.filename,
      createdAt: report.createdAt,
      qualityLabel: report.qualityAssessment?.label || null,
      qualityScore: Number(((report.qualityAssessment?.goodScore || 0) * 100).toFixed(1)),
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10);

  const trendData = Array.from(trendBuckets.values()).map((bucket) => ({
    periodKey: bucket.periodKey,
    period: bucket.periodLabel,
    reports: bucket.reportCount,
    errors: bucket.errorCount,
    passed: bucket.passedCount,
    failed: bucket.failedCount,
    passRate:
      bucket.analyzedCount > 0
        ? Number(((bucket.passedCount / bucket.analyzedCount) * 100).toFixed(1))
        : 0,
  }));

  const userLeaderboard = Array.from(userStats.values())
    .map((userStat) => ({
      ...userStat,
      passRate: userStat.reportCount > 0
        ? Number(((userStat.passedCount / userStat.reportCount) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 10);

  const recentReports = reports.slice(0, 10).map((report) => ({
    _id: report._id,
    filename: report.filename,
    status: report.status,
    errorCount: report.errorCount || 0,
    qualityLabel: report.qualityAssessment?.label || null,
    analyzedBy: report.analyzedBy?.name || 'Unknown',
    createdAt: report.createdAt,
  }));

  return {
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
    passFailRateTrends,
    qualityScoreTrend,
    mostCommonErrorTypes,
    checklistFailureBreakdown,
    topErrors,
    userLeaderboard,
    recentReports,
  };
};

const resolveAdminAnalyticsScope = async ({ level, entityId }) => {
  if (level === 'team' && entityId) {
    const team = await Team.findById(entityId).populate('members', 'name email').lean();
    if (!team) {
      return null;
    }

    return {
      filter: { analyzedBy: { $in: team.members.map((member) => member._id) } },
      scopeLabel: `Team: ${team.name}`,
      scopeDetails: {
        teamId: team._id,
        teamName: team.name,
        memberCount: team.members.length,
      },
    };
  }

  if (level === 'user' && entityId) {
    const targetUser = await User.findById(entityId).select('name email role').lean();
    if (!targetUser) {
      return null;
    }

    return {
      filter: { analyzedBy: entityId },
      scopeLabel: `User: ${targetUser.name}`,
      scopeDetails: {
        userId: targetUser._id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        userRole: targetUser.role,
      },
    };
  }

  return {
    filter: {},
    scopeLabel: 'Company-wide',
    scopeDetails: null,
  };
};

// GET /api/admin/analytics?level=company|team|user&teamId=xxx&userId=xxx&compareTeamId=xxx&compareUserId=xxx&range=7|30|90|all
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      level = 'company',
      teamId,
      userId,
      compareTeamId,
      compareUserId,
      range = '30',
    } = req.query;

    const comparisonType = level === 'team' ? 'team' : level === 'user' ? 'user' : null;
    const comparisonId = comparisonType === 'team' ? compareTeamId : compareUserId;
    const primaryId = comparisonType === 'team' ? teamId : comparisonType === 'user' ? userId : null;
    const comparisonMode = Boolean(comparisonType && primaryId && comparisonId);

    if (comparisonMode && primaryId === comparisonId) {
      return res.status(400).json({ message: 'Comparison requires two different selections' });
    }

    const primaryScope = await resolveAdminAnalyticsScope({
      level,
      entityId: comparisonType ? primaryId : null,
    });

    if (!primaryScope) {
      return res.status(404).json({ message: `${comparisonType === 'team' ? 'Team' : 'User'} not found` });
    }

    if (!comparisonMode) {
      const payload = await buildAdminAnalyticsPayload({
        filter: primaryScope.filter,
        scopeLabel: primaryScope.scopeLabel,
        scopeDetails: primaryScope.scopeDetails,
        range,
      });

      return res.json({
        level,
        range,
        ...payload,
      });
    }

    const secondaryScope = await resolveAdminAnalyticsScope({
      level,
      entityId: comparisonId,
    });

    if (!secondaryScope) {
      return res.status(404).json({ message: `${comparisonType === 'team' ? 'Team' : 'User'} not found` });
    }

    const [primaryPayload, secondaryPayload] = await Promise.all([
      buildAdminAnalyticsPayload({
        filter: primaryScope.filter,
        scopeLabel: primaryScope.scopeLabel,
        scopeDetails: primaryScope.scopeDetails,
        range,
      }),
      buildAdminAnalyticsPayload({
        filter: secondaryScope.filter,
        scopeLabel: secondaryScope.scopeLabel,
        scopeDetails: secondaryScope.scopeDetails,
        range,
      }),
    ]);

    return res.json({
      level,
      range,
      comparisonMode: true,
      comparisonType,
      primaryScope: primaryPayload,
      secondaryScope: secondaryPayload,
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
