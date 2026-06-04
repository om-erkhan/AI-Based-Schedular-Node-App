const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforexamscheduling');
    
    const user = await prisma.auth_user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or disabled' });
    }

    // Attach user profile to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isSuperuser: user.is_superuser,
      isStaff: user.is_staff
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
