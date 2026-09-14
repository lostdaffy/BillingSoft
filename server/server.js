require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { runMigrations } = require('./services/migrate');

const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}. See .env.example.`);
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.warn('Warning: JWT_SECRET should be a random string of at least 32 characters.');
}

const start = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  if (process.env.AUTO_MIGRATE !== 'false') {
    await runMigrations();
  }

  const app = createApp();
  const port = process.env.PORT || 5000;
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      mongoose.connection.close(false).finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
