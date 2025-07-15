import { healthRoutes } from './routes/healthRoutes.js';
import { requestCounter, errorCounter, trackQuizGeneration } from './middleware/monitoring.js';

// Add monitoring middleware
app.use(requestCounter);
app.use(trackQuizGeneration);

// Add health routes
app.use('/api', healthRoutes);

// Add error monitoring (should be last)
app.use(errorCounter);