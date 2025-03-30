import createAdminUser from './src/utils/adminSeed.js';
import dotenv from 'dotenv';
import { testConnection } from './src/config/db.js';

// Load environment variables
dotenv.config();

const runSeed = async () => {
    try {
        console.log('Testing database connection...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('Failed to connect to the database. Please check your database configuration.');
            process.exit(1);
        }

        console.log('Database connection successful!');

        // Run the admin seed
        await createAdminUser();

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during seed process:', error);
        process.exit(1);
    }
};

runSeed();