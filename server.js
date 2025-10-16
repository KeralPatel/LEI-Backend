const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Token distribution now handled by routes/distribution.js
const { sequelize, testConnection } = require('./config/database');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Import routes
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const distributionRoutes = require('./routes/distribution');

// Route imports
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', distributionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Token Distribution API',
    network: 'Knightsbridge',
    chainId: process.env.CHAIN_ID || 8060
  });
});

// Distribution endpoints moved to routes/distribution.js

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoints:`);
      console.log(`   - User: http://localhost:${PORT}/api/user`);
      console.log(`   - Wallet: http://localhost:${PORT}/api/wallet`);
      console.log(`   - Distribution: http://localhost:${PORT}/api/distribute-tokens`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
