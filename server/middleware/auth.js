const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Please log in to continue' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Account not found. Please log in again.' });
    }

    // Always an ObjectId (never the raw string from the token) so that
    // aggregation pipelines, which skip Mongoose casting, match correctly.
    req.userId = user._id;
    req.user = user;
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    res.status(401).json({ message: expired ? 'Session expired. Please log in again.' : 'Invalid session. Please log in again.' });
  }
};

module.exports = auth;
