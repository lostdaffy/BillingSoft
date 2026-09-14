const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/error');

const DEFAULT_ORIGINS = ['https://ebillsoft.netlify.app'];
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const allowedOrigins = () =>
  (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : DEFAULT_ORIGINS)
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const createApp = () => {
  const app = express();
  const origins = allowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';

  // Render, Railway, Heroku etc. sit behind one proxy hop; needed for rate limiting by client IP.
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(
    cors({
      origin(origin, callback) {
        const allowed = !origin || origins.includes(origin) || (!isProduction && LOCALHOST.test(origin));
        callback(null, allowed);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/', (req, res) => res.json({ name: 'eBillSoft API', status: 'ok' }));
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      time: new Date()
    });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/invoices', require('./routes/invoices'));
  app.use('/api/purchases', require('./routes/purchases'));
  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/expenses', require('./routes/expenses'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/public', require('./routes/public'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
