import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'c34_match_desk_super_secure_jwt_token_key_2026!');
    
    // Check if user still exists and is active in database
    const [users] = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    const user = users[0];
    if (user.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'This user account has been disabled. Contact administrator.' });
    }

    req.user = user;

    // Attach profile ID if organizer or sponsor
    if (user.role === 'organizer') {
      const [orgs] = await pool.query('SELECT id FROM organizer_profiles WHERE user_id = ?', [user.id]);
      if (orgs.length > 0) req.user.organizerId = orgs[0].id;
    } else if (user.role === 'sponsor') {
      const [spons] = await pool.query('SELECT id FROM sponsor_profiles WHERE user_id = ?', [user.id]);
      if (spons.length > 0) req.user.sponsorId = spons[0].id;
    }

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    
    // Flatten array in case an array was passed
    const roles = allowedRoles.flat();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Action restricted to: ${roles.join(', ')}`
      });
    }
    return next();
  };
}
