const Report = require('../models/Report');
const User = require('../models/User');
const Team = require('../models/Team');
const { processDocument } = require('../services/pdfService');
const { analyzeDocument } = require('../services/errorDetection');
const { predictQualityFromTraining } = require('../services/trainingService');
const { generateReportPdf } = require('../services/reportPdfService');
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
      status: 'processing',
    });

    res.status(201).json({
      _id: report._id,
      filename: report.filename,
      fileSize: report.fileSize,
      status: report.status,
      message: 'File uploaded successfully. Processing started.',
    });

    processReportAsync(report._id, req.file.path);

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

const processReportAsync = async (reportId, filePath) => {
  try {
    console.log(`Processing report ${reportId}...`);
    
    const documentData = await processDocument(filePath);
    console.log(`Text extracted: ${documentData.wordCount} words`);

    const analysisResults = await analyzeDocument(
      documentData.text,
      documentData.sections,
      { headerFields: documentData.headerFields }
    );
    console.log(`Analysis complete: ${analysisResults.errorCount} errors found`);

    const qualityAssessment = await predictQualityFromTraining(
      documentData.text,
      analysisResults
    );
    console.log(
      `Quality prediction: ${qualityAssessment.label} (confidence ${qualityAssessment.confidence})`
    );

    await Report.findByIdAndUpdate(reportId, {
      status: 'analyzed',
      extractedText: documentData.text,
      errors: analysisResults.errors,
      errorCount: analysisResults.errorCount,
      errorSummary: analysisResults.errorSummary,
      timeSaved: analysisResults.timeSaved,
      qualityAssessment: {
        label: qualityAssessment.label,
        confidence: qualityAssessment.confidence,
        goodScore: qualityAssessment.goodScore,
        badScore: qualityAssessment.badScore,
        matchedExamples: qualityAssessment.matchedExamples,
        method: qualityAssessment.method || 'checklist-rule-good-profile',
        evaluatedAt: new Date(),
      },
      metadata: {
        pageCount: documentData.numPages,
        wordCount: documentData.wordCount,
        sections: documentData.sections.map(s => s.title),
        headerFields: documentData.headerFields,
      },
    });

    console.log(`Report ${reportId} processed successfully`);
  } catch (error) {
    console.error(`Error processing report ${reportId}:`, error);
    await Report.findByIdAndUpdate(reportId, {
      status: 'failed',
    });
  }
};

const analyzeReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (
      req.user.role === 'user' &&
      report.analyzedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!report.filePath || !fs.existsSync(report.filePath)) {
      return res.status(400).json({ message: 'PDF file not found' });
    }

    report.status = 'processing';
    await report.save();

    res.json({ message: 'Analysis started', reportId: report._id });

    processReportAsync(report._id, report.filePath);

  } catch (error) {
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
      .select('-extractedText')
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

    if (report.filePath && fs.existsSync(report.filePath)) {
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

const getProfileAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const reports = await Report.find({ analyzedBy: userId })
      .select(
        'filename status errorCount errorSummary timeSaved qualityAssessment createdAt'
      )
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

    const qualityBreakdown = {
      good: 0,
      bad: 0,
      uncertain: 0,
    };

    const monthFormatter = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const now = new Date();
    const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const trendBuckets = new Map();

    for (let offset = 0; offset < 6; offset += 1) {
      const bucketDate = new Date(
        Date.UTC(trendStart.getUTCFullYear(), trendStart.getUTCMonth() + offset, 1)
      );
      const key = `${bucketDate.getUTCFullYear()}-${String(
        bucketDate.getUTCMonth() + 1
      ).padStart(2, '0')}`;

      trendBuckets.set(key, {
        periodLabel: monthFormatter.format(bucketDate),
        reportCount: 0,
        errorCount: 0,
      });
    }

    reports.forEach((report) => {
      summary.totalErrors += report.errorCount || 0;
      summary.totalTimeSaved += report.timeSaved || 0;

      if (report.status === 'analyzed') {
        summary.analyzedReports += 1;
      } else if (report.status === 'failed') {
        summary.failedReports += 1;
      } else if (['pending', 'processing'].includes(report.status)) {
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

      const createdAt = report.createdAt ? new Date(report.createdAt) : null;
      if (createdAt && createdAt >= trendStart) {
        const key = `${createdAt.getUTCFullYear()}-${String(
          createdAt.getUTCMonth() + 1
        ).padStart(2, '0')}`;
        const existingBucket = trendBuckets.get(key);

        if (existingBucket) {
          existingBucket.reportCount += 1;
          existingBucket.errorCount += report.errorCount || 0;
        }
      }
    });

    if (summary.analyzedReports > 0) {
      summary.averageErrorsPerReport = Number(
        (summary.totalErrors / summary.analyzedReports).toFixed(2)
      );
    }

    const recentReports = reports.slice(0, 5).map((report) => ({
      _id: report._id,
      filename: report.filename,
      createdAt: report.createdAt,
      status: report.status,
      errorCount: report.errorCount || 0,
      timeSaved: report.timeSaved || 0,
      qualityLabel: report.qualityAssessment?.label || null,
    }));

    res.json({
      summary,
      errorBreakdown,
      qualityBreakdown,
      trends: Array.from(trendBuckets.values()),
      recentReports,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReportText = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).select('extractedText filename analyzedBy');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (
      req.user.role === 'user' &&
      report.analyzedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      filename: report.filename,
      text: report.extractedText || 'No text extracted yet',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('analyzedBy', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const analyzedById = typeof report.analyzedBy === 'object'
      ? report.analyzedBy._id.toString()
      : report.analyzedBy.toString();

    if (
      req.user.role === 'user' &&
      analyzedById !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find the user's team (if any)
    const team = await Team.findOne({ members: analyzedById })
      .populate('teamLead', 'name email')
      .lean();

    const user = report.analyzedBy;
    const sanitisedFilename = report.filename.replace(/\.pdf$/i, '');
    const downloadName = `QC_Report_${sanitisedFilename}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

    const doc = generateReportPdf(report, user, team);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadReport,
  analyzeReport,
  getReports,
  getReportById,
  deleteReport,
  getReportStats,
  getProfileAnalytics,
  getReportText,
  downloadReport,
};
