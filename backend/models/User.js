const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    highContrast: {
      type: Boolean,
      default: false,
    },
    fontSize: {
      type: Number,
      default: 100,
      min: 80,
      max: 150,
    },
    colorblindMode: {
      type: String,
      enum: ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
      default: 'none',
    },
    reducedMotion: {
      type: Boolean,
      default: false,
    },
    notifications: {
      teamAssignment: { type: Boolean, default: true },
      teamRemoval: { type: Boolean, default: true },
      reportComplete: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'team_leader', 'user'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual('reportsCount', {
  ref: 'Report',
  localField: '_id',
  foreignField: 'analyzedBy',
  count: true,
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
