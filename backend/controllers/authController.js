const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const Report = require('../models/Report');
const generateToken = require('../utils/generateToken');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'inactive') {
      return res.status(401).json({ message: 'Account is inactive. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      preferences: user.preferences,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('managedBy', 'name email')
      .lean();

    // Check if user belongs to any team
    const team = await Team.findOne({ members: user._id }).select('_id name').lean();
    user.team = team || null;

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Please provide new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);

    if (!user.mustChangePassword && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) {
      user.name = name.trim();
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { theme, highContrast, fontSize, colorblindMode, reducedMotion, notifications } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.preferences) {
      user.preferences = {};
    }

    if (theme !== undefined) user.preferences.theme = theme;
    if (highContrast !== undefined) user.preferences.highContrast = highContrast;
    if (fontSize !== undefined) user.preferences.fontSize = Math.min(150, Math.max(80, fontSize));
    if (colorblindMode !== undefined) user.preferences.colorblindMode = colorblindMode;
    if (reducedMotion !== undefined) user.preferences.reducedMotion = reducedMotion;

    if (notifications) {
      if (!user.preferences.notifications) {
        user.preferences.notifications = {};
      }
      if (notifications.teamAssignment !== undefined) {
        user.preferences.notifications.teamAssignment = notifications.teamAssignment;
      }
      if (notifications.teamRemoval !== undefined) {
        user.preferences.notifications.teamRemoval = notifications.teamRemoval;
      }
      if (notifications.reportComplete !== undefined) {
        user.preferences.notifications.reportComplete = notifications.reportComplete;
      }
      if (notifications.weeklySummary !== undefined) {
        user.preferences.notifications.weeklySummary = notifications.weeklySummary;
      }
    }

    user.markModified('preferences');
    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.preferences || {});
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reports = await Report.find({ analyzedBy: req.user._id })
      .select('-extractedText')
      .lean();

    const team = await Team.findOne({ members: req.user._id })
      .select('name')
      .lean();

    const exportData = {
      exportDate: new Date().toISOString(),
      account: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        preferences: user.preferences,
      },
      team: team ? { name: team.name } : null,
      reports: reports.map((r) => ({
        filename: r.filename,
        status: r.status,
        errorCount: r.errorCount,
        errorSummary: r.errorSummary,
        qualityAssessment: r.qualityAssessment,
        timeSaved: r.timeSaved,
        createdAt: r.createdAt,
      })),
      statistics: {
        totalReports: reports.length,
        totalErrors: reports.reduce((sum, r) => sum + (r.errorCount || 0), 0),
        totalTimeSaved: reports.reduce((sum, r) => sum + (r.timeSaved || 0), 0),
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="qc-checker-data-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { confirmEmail } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be self-deleted' });
    }

    if (confirmEmail !== user.email) {
      return res.status(400).json({ message: 'Email confirmation does not match' });
    }

    await Report.deleteMany({ analyzedBy: req.user._id });

    const teamsAsLead = await Team.find({ teamLead: req.user._id });
    for (const team of teamsAsLead) {
      team.teamLead = null;
      team.members = team.members.filter((m) => m.toString() !== req.user._id.toString());
      await team.save();
    }

    await Team.updateMany(
      { members: req.user._id },
      { $pull: { members: req.user._id } }
    );

    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
  updateProfile,
  updatePreferences,
  getPreferences,
  exportUserData,
  deleteAccount,
};
