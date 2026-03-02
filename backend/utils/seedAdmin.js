const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      const admin = await User.create({
        name: 'System Admin',
        email: 'admin@qcchecker.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        mustChangePassword: false,
      });
      
      console.log('Default admin created: admin@qcchecker.com');
    }
  } catch (error) {
    console.error('Error seeding admin:', error.message);
  }
};

module.exports = seedAdmin;
