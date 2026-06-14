const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforexamscheduling');
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Attach user profile to request directly from the cryptographically signed token
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      isSuperuser: !!decoded.isSuperuser,
      isStaff: !!decoded.isStaff
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || (!req.user.isSuperuser && !req.user.isStaff)) {
    return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin
};
