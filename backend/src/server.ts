import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import earnRoutes from './routes/earn';
import storeRoutes from './routes/store';
import userRoutes from './routes/user';
import giveawayRoutes from './routes/giveaway';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for tunnels (localtunnel, ngrok, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/earn', earnRoutes);
app.use('/store', storeRoutes);
app.use('/me', userRoutes);
app.use('/giveaway', giveawayRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 EarnLoop API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
