const mongoose = require('mongoose');

const errorSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['placeholder', 'consistency', 'compliance', 'formatting', 'missing_data'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    message: {
      type: String,
      required: true,
    },
    location: {
      section: String,
      page: Number,
      lineStart: Number,
      lineEnd: Number,
    },
    suggestion: {
      type: String,
    },
    originalText: {
      type: String,
    },
  },
  { _id: true }
);

const reportSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    fileSize: {
      type: Number,
    },
    analyzedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'analyzed', 'failed'],
      default: 'pending',
    },
    errors: [errorSchema],
    errorCount: {
      type: Number,
      default: 0,
    },
    errorSummary: {
      placeholder: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
      compliance: { type: Number, default: 0 },
      formatting: { type: Number, default: 0 },
      missing_data: { type: Number, default: 0 },
    },
    timeSaved: {
      type: Number,
      default: 0,
    },
    extractedText: {
      type: String,
    },
    addedToTraining: {
      type: Boolean,
      default: false,
    },
    metadata: {
      pageCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      sections: [String],
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.pre('save', function (next) {
  if (this.errors) {
    this.errorCount = this.errors.length;
    
    this.errorSummary = {
      placeholder: 0,
      consistency: 0,
      compliance: 0,
      formatting: 0,
      missing_data: 0,
    };
    
    this.errors.forEach((error) => {
      if (this.errorSummary[error.type] !== undefined) {
        this.errorSummary[error.type]++;
      }
    });
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
