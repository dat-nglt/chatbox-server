import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import db from './models/index.js';
import routeForWebhook from './routes/zalo.webhook.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/zalo', routeForWebhook);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection
db.sequelize.authenticate()
    .then(() => {
        logger.info('Database connected successfully');
    })
    .catch((err) => {
        logger.error('Database connection failed:', err);
        process.exit(1);
    });

// Start server
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

export default app;