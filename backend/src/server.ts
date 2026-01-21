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

let adminRoutes: any;
try {
  adminRoutes = require('./routes/admin').default;
  console.log('✅ Admin routes imported successfully');
} catch (err: any) {
  console.error('❌ Failed to import admin routes:', err.message);
}

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

// Test endpoint for admin
app.get('/admin-test', (req, res) => {
  res.json({ working: true, adminRoutesLoaded: !!adminRoutes });
});

// AdMob SSV Callback - MUST be before authenticated routes
// This is called by Google's servers, not the app
app.get('/earn/admob-ssv', (req, res) => {
  console.log('📺 AdMob SSV callback received at server level:', req.query);
  
  // For verification ping from AdMob console (no params), return 200
  if (!req.query.transaction_id && !req.query.user_id) {
    console.log('✅ AdMob SSV verification ping - OK');
    return res.status(200).send('OK');
  }
  
  // For actual callbacks, forward to the earn router
  // This shouldn't be reached as the earn router handles it
  res.status(200).send('OK');
});

// API Routes
app.use('/auth', authRoutes);
app.use('/earn', earnRoutes);
app.use('/store', storeRoutes);
app.use('/me', userRoutes);
app.use('/giveaway', giveawayRoutes);
if (adminRoutes) {
  app.use('/admin', adminRoutes);
}

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 EarnLoop API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📺 AdMob SSV endpoint ready at /earn/admob-ssv`);
  console.log(`� Admin routes loaded at /admin`);
  console.log(`�🕐 Server ready at: ${new Date().toISOString()}`);
});

export default app;
