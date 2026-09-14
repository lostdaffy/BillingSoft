// Manually run the v1 -> v2 data upgrade (also runs automatically on server start
// unless AUTO_MIGRATE=false). Safe to run more than once.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { runMigrations } = require('../services/migrate');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await runMigrations();
  console.log('Migration finished:', result);
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
