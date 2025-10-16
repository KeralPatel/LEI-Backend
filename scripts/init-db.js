const { sequelize } = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Create tables
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created');
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
