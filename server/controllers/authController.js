import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { pingOllama } from '../services/ollamaService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'c34_match_desk_super_secure_jwt_token_key_2026!';

export async function register(req, res, next) {
  try {
    const { name, email, password, role, organizationName, companyName, industry, city, state, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    if (!['organizer', 'sponsor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be either organizer or sponsor.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check if email already registered
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert user
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name.trim(), email.toLowerCase().trim(), passwordHash, role, phone || null, 'active']
      );
      const userId = userResult.insertId;

      // 2. Create corresponding role profile
      if (role === 'organizer') {
        await connection.query(
          `INSERT INTO organizer_profiles (user_id, organization_name, city, state, contact_email, contact_phone)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, organizationName || `${name}'s Organization`, city || 'Bangalore', state || 'Karnataka', email, phone || null]
        );
      } else if (role === 'sponsor') {
        const [sponsorResult] = await connection.query(
          `INSERT INTO sponsor_profiles (user_id, company_name, industry, location, contact_name, contact_email, contact_phone)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, companyName || `${name} Corp`, industry || 'Technology', `${city || 'Bangalore'}, ${state || 'Karnataka'}`, name, email, phone || null]
        );
        const sponsorId = sponsorResult.insertId;

        // Default empty preferences
        await connection.query(
          `INSERT INTO sponsor_preferences (sponsor_id, preferred_categories, target_cities, min_budget, max_budget, excluded_categories)
           VALUES (?, '["Technology & AI"]', '["Bangalore"]', 25000.00, 250000.00, '["Tobacco", "Gambling"]')`,
          [sponsorId]
        );
      }

      await connection.commit();

      // Generate token
      const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: {
          token,
          user: { id: userId, name, email, role, status: 'active', phone }
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    if (user.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'Account is disabled. Contact platform administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Fetch profile details
    let profile = null;
    if (user.role === 'organizer') {
      const [orgs] = await pool.query('SELECT * FROM organizer_profiles WHERE user_id = ?', [user.id]);
      if (orgs.length > 0) profile = orgs[0];
    } else if (user.role === 'sponsor') {
      const [spons] = await pool.query('SELECT * FROM sponsor_profiles WHERE user_id = ?', [user.id]);
      if (spons.length > 0) profile = spons[0];
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone,
          profile
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = req.user;
    let profile = null;
    let preferences = null;

    if (user.role === 'organizer') {
      const [orgs] = await pool.query('SELECT * FROM organizer_profiles WHERE user_id = ?', [user.id]);
      if (orgs.length > 0) profile = orgs[0];
    } else if (user.role === 'sponsor') {
      const [spons] = await pool.query('SELECT * FROM sponsor_profiles WHERE user_id = ?', [user.id]);
      if (spons.length > 0) {
        profile = spons[0];
        const [prefs] = await pool.query('SELECT * FROM sponsor_preferences WHERE sponsor_id = ?', [profile.id]);
        if (prefs.length > 0) preferences = prefs[0];
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone,
          profile,
          preferences
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, phone, organizationName, companyName, industry, description, website, location, city, state, marketingObjectives, targetAudience, brandPreferences } = req.body;

    if (name) {
      await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, userId]);
    }

    if (req.user.role === 'organizer') {
      await pool.query(
        `UPDATE organizer_profiles 
         SET organization_name = COALESCE(?, organization_name),
             description = COALESCE(?, description),
             website = COALESCE(?, website),
             city = COALESCE(?, city),
             state = COALESCE(?, state)
         WHERE user_id = ?`,
        [organizationName, description, website, city, state, userId]
      );
    } else if (req.user.role === 'sponsor') {
      await pool.query(
        `UPDATE sponsor_profiles 
         SET company_name = COALESCE(?, company_name),
             industry = COALESCE(?, industry),
             description = COALESCE(?, description),
             website = COALESCE(?, website),
             location = COALESCE(?, location),
             marketing_objectives = COALESCE(?, marketing_objectives),
             target_audience = COALESCE(?, target_audience),
             brand_preferences = COALESCE(?, brand_preferences)
         WHERE user_id = ?`,
        [companyName, industry, description, website, location, marketingObjectives, targetAudience, brandPreferences, userId]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
}

// --------------------------------------------------------------------
// Admin Endpoints
// --------------------------------------------------------------------
export async function listAdminUsers(req, res, next) {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    let query = 'SELECT id, name, email, role, status, phone, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [users] = await pool.query(query, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');

    res.json({
      success: true,
      data: {
        users,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or disabled' });
    }

    if (Number(targetUserId) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own admin account' });
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, targetUserId]);
    res.json({ success: true, message: `User status changed to ${status}` });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const targetUserId = req.params.id;

    if (Number(targetUserId) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete own admin account' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [targetUserId]);
    res.json({ success: true, message: 'User account deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getSystemHealth(req, res, next) {
  try {
    // 1. Database check
    let dbStatus = 'operational';
    let dbStats = {};
    try {
      const [usersCount] = await pool.query('SELECT COUNT(*) as c FROM users');
      const [eventsCount] = await pool.query('SELECT COUNT(*) as c FROM events');
      const [proposalsCount] = await pool.query('SELECT COUNT(*) as c FROM proposals');
      const [agreementsCount] = await pool.query('SELECT COUNT(*) as c FROM agreements');
      dbStats = {
        users: usersCount[0].c,
        events: eventsCount[0].c,
        proposals: proposalsCount[0].c,
        agreements: agreementsCount[0].c
      };
    } catch (err) {
      dbStatus = 'degraded: ' + err.message;
    }

    // 2. Ollama check
    const ollamaHealth = await pingOllama();

    res.json({
      success: true,
      data: {
        backend: { status: 'operational', uptime: process.uptime(), timestamp: new Date() },
        database: { status: dbStatus, stats: dbStats },
        ollama: ollamaHealth
      }
    });
  } catch (error) {
    next(error);
  }
}
