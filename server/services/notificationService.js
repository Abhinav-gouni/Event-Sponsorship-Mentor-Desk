import pool from '../config/database.js';

/**
 * Creates an in-app notification with strict idempotency deduplication.
 * If a notification with the same idempotencyKey already exists, it is ignored (safe no-op).
 */
export async function createNotification({ recipientUserId, eventId = null, purpose, idempotencyKey, title, message }) {
  if (!recipientUserId || !idempotencyKey || !title || !message) {
    console.warn('[NotificationService] Missing required parameters for notification');
    return null;
  }

  try {
    const [result] = await pool.query(
      `INSERT IGNORE INTO notifications (recipient_user_id, event_id, purpose, idempotency_key, title, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipientUserId, eventId, purpose, idempotencyKey, title, message]
    );

    if (result.affectedRows === 0) {
      // Deduplicated (already exists)
      return { status: 'deduplicated', idempotencyKey };
    }

    return { id: result.insertId, status: 'created', idempotencyKey };
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    throw err;
  }
}

export async function getUserNotifications(userId, unreadOnly = false) {
  let query = 'SELECT * FROM notifications WHERE recipient_user_id = ?';
  const params = [userId];

  if (unreadOnly) {
    query += ' AND is_read = 0';
  }
  query += ' ORDER BY created_at DESC LIMIT 50';

  const [rows] = await pool.query(query, params);
  return rows;
}

export async function markAsRead(notificationId, userId) {
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?',
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}

export async function markAllAsRead(userId) {
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?',
    [userId]
  );
  return result.affectedRows;
}
