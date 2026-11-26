const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { startPriceJob } = require('./services/priceJob');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error('❌ MONGO_URI and JWT_SECRET must be set in the .env file');
  process.exit(1);
}

connectDB().then(startPriceJob);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again in a few minutes' }
});

app.get('/', (req, res) => {
  res.json({
    message: '🛒 StellarDeals API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      deals: '/api/deals',
      clicks: '/api/clicks',
      notifications: '/api/notifications',
      reviews: '/api/reviews',
      wishlist: '/api/wishlist',
      compare: '/api/compare',
      alerts: '/api/alerts',
      recommendations: '/api/recommendations',
      admin: '/api/admin'
    }
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/deals', require('./routes/dealsRoutes'));
app.use('/api/clicks', require('./routes/clickRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/compare', require('./routes/compareRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
