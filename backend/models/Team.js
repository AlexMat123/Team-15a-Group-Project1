const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a team name'],
      unique: true,
      trim: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    memberJoinDates: {
      type: Map,
      of: Date,
      default: () => new Map(),
    },
    teamLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    goals: [
      {
        title: { type: String, required: true, trim: true },
        type: {
          type: String,
          enum: ['pass_rate', 'reports_submitted', 'avg_errors_below'],
          required: true,
        },
        target: { type: Number, required: true },
        deadline: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Team', teamSchema);
