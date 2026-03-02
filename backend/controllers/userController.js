const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEFAULT_PASSWORD = 'Welcome123!';

const getUsers = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'team_leader') {
      query = {
        $or: [
          { managedBy: req.user._id },
          { _id: req.user._id }
        ]
      };
    }
    
    const users = await User.find(query)
      .select('-password')
      .populate('managedBy', 'name email')
      .sort({ createdAt: -1 });
      
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('managedBy', 'name email');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'team_leader' && 
        user._id.toString() !== req.user._id.toString() &&
        user.managedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this user' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, role, managedBy } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Please provide name and email' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (req.user.role === 'team_leader' && role && role !== 'user') {
      return res.status(403).json({ message: 'Team leaders can only create users' });
    }

    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create admin accounts' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const userData = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'user',
      status: 'active',
      mustChangePassword: true,
    };

    if (req.user.role === 'team_leader') {
      userData.managedBy = req.user._id;
    } else if (managedBy) {
      userData.managedBy = managedBy;
    }

    const user = await User.create(userData);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      message: `User created with default password: ${DEFAULT_PASSWORD}`,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'team_leader') {
      if (user.managedBy?.toString() !== req.user._id.toString() && 
          user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this user' });
      }
      
      if (req.body.role && req.body.role !== 'user') {
        return res.status(403).json({ message: 'Team leaders cannot change roles' });
      }
    }

    if (req.body.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can promote to admin' });
    }

    const allowedUpdates = ['name', 'email', 'status'];
    
    if (req.user.role === 'admin') {
      allowedUpdates.push('role', 'managedBy');
    }

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('managedBy', 'name email');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    if (req.user.role === 'team_leader') {
      if (user.managedBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this user' });
      }
    }

    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete admin accounts' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'team_leader') {
      if (user.managedBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to reset this user\'s password' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(DEFAULT_PASSWORD, salt);
    user.mustChangePassword = true;
    await user.save();

    res.json({ 
      message: `Password reset to default: ${DEFAULT_PASSWORD}`,
      mustChangePassword: true 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
};
