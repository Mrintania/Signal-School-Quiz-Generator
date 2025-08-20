// backend/database/connection.js
import { Sequelize } from 'sequelize';
import config from '../config/config.js';

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: config.database.logging,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  }
);

// Test database connection
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database in development
    if (config.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized.');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    
    // For development, create a simple in-memory database
    if (config.NODE_ENV === 'development') {
      console.log('🔄 Falling back to SQLite in-memory database for development...');
      
      const fallbackSequelize = new Sequelize('sqlite::memory:', {
        logging: false,
      });
      
      try {
        await fallbackSequelize.authenticate();
        console.log('✅ SQLite in-memory database connected successfully.');
        return fallbackSequelize;
      } catch (fallbackError) {
        console.error('❌ Fallback database connection failed:', fallbackError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

export default sequelize;