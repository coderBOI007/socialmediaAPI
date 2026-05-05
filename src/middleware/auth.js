const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { error } = require('../utils/response');

// Requires a valid JWT
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authentication required. Please log in.', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user) return error(res, 'User no longer exists.', 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Token expired. Please log in again.', 401);
    return error(res, 'Invalid token. Please log in.', 401);
  }
};

// Optionally attaches user if token is present — does not block unauthenticated requests
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (_) {
    // silently ignore
  }
  next();
};

module.exports = { protect, optionalAuth };