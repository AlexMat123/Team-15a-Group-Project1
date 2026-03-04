const Report = require('../models/Report');
const fs = require('fs');
const path = require('path');

const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    const report = await Report.create({
      filename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      analyzedBy: req.user._id,
      status: 'pending',
    });

    res.status(201).json({
      _id: report._id,
      filename: report.filename,
      fileSize: report.fileSize,
      status: report.status,
      message: 'File uploaded successfully. Analysis pending.',
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'user') {
      query.analyzedBy = req.user._id;
    } else if (req.user.role === 'team_leader') {
      const User = require('../models/User');
      const teamMembers = await User.find({ managedBy: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map((u) => u._id);
      teamMemberIds.push(req.user._id);
      query.analyzedBy = { $in: teamMemberIds };
    }

    const reports = await Report.find(query)
      .populate('analyzedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('analyzedBy', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (
      req.user.role === 'user' &&
      report.analyzedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (
      req.user.role === 'user' &&
      report.analyzedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    if (report.filePath) {
      fs.unlink(report.filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReportStats = async (req, res) => {
  try {
    let matchQuery = {};

    if (req.user.role === 'user') {
      matchQuery.analyzedBy = req.user._id;
    } else if (req.user.role === 'team_leader') {
      const User = require('../models/User');
      const teamMembers = await User.find({ managedBy: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map((u) => u._id);
      teamMemberIds.push(req.user._id);
      matchQuery.analyzedBy = { $in: teamMemberIds };
    }

    const stats = await Report.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalErrors: { $sum: '$errorCount' },
          totalTimeSaved: { $sum: '$timeSaved' },
          placeholderErrors: { $sum: '$errorSummary.placeholder' },
          consistencyErrors: { $sum: '$errorSummary.consistency' },
          complianceErrors: { $sum: '$errorSummary.compliance' },
          formattingErrors: { $sum: '$errorSummary.formatting' },
          missingDataErrors: { $sum: '$errorSummary.missing_data' },
        },
      },
    ]);

    const result = stats[0] || {
      totalReports: 0,
      totalErrors: 0,
      totalTimeSaved: 0,
      placeholderErrors: 0,
      consistencyErrors: 0,
      complianceErrors: 0,
      formattingErrors: 0,
      missingDataErrors: 0,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadReport,
  getReports,
  getReportById,
  deleteReport,
  getReportStats,
};
