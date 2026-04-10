const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');

dotenv.config();

const app = express();

connectDB().then(() => {
  seedAdmin();
});

// Trust the first proxy hop so req.ip and x-forwarded-for are populated correctly
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/training', express.static(path.join(__dirname, 'training')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/password-reset-requests', require('./routes/passwordResetRequestRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to QC Checker API' });
});

app.get('/api/health', (req, res) => {
  const mlService = require('./services/mlService');
  res.json({
    status: 'ok',
    mlReady: mlService.isModelReady(),
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  if (process.env.PRELOAD_ML !== 'false') {
    console.log('Preloading ML models in background...');
    const mlService = require('./services/mlService');
    mlService.preloadModels();
  }
});
