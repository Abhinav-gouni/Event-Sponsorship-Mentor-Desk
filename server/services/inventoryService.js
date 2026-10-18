import pool from '../config/database.js';

/**
 * Validates whether an inventory item can be reserved.
 * For exclusive items (is_exclusive = 1), checks if any active reservation already exists.
 */
export async function checkInventoryAvailability(connection, inventoryId, requestedQuantity = 1) {
  // Query with FOR UPDATE lock inside a transaction
  const [rows] = await connection.query(
    'SELECT * FROM sponsorship_inventory WHERE id = ? FOR UPDATE',
    [inventoryId]
  );

  if (rows.length === 0) {
    throw new Error(`Inventory item #${inventoryId} not found`);
  }

  const item = rows[0];

  if (item.available_quantity < requestedQuantity) {
    throw new Error(
      `Insufficient inventory for '${item.name}'. Available: ${item.available_quantity}, requested: ${requestedQuantity}`
    );
  }

  // Critical rule: Exclusive item check
  if (item.is_exclusive) {
    const [reservations] = await connection.query(
      `SELECT r.*, s.company_name 
       FROM inventory_reservations r
       JOIN sponsor_profiles s ON r.sponsor_id = s.id
       WHERE r.inventory_id = ? AND r.status IN ('reserved_pending', 'confirmed_contracted')`,
      [inventoryId]
    );

    if (reservations.length > 0) {
      throw new Error(
        `Exclusive item conflict: '${item.name}' is an exclusive tier already committed/reserved for ${reservations[0].company_name}. Multiple commitments are prohibited.`
      );
    }
  }

  return item;
}

/**
 * Transaction-safe reservation of inventory items for a proposal or agreement.
 */
export async function reserveInventoryItem(connection, { inventoryId, sponsorId, agreementId = null, proposalId = null, quantity = 1, isExclusive = false }) {
  // 1. Verify availability under lock
  const item = await checkInventoryAvailability(connection, inventoryId, quantity);

  // 2. Decrement available quantity and update status
  const newAvailable = item.available_quantity - quantity;
  const newStatus = newAvailable <= 0 ? 'sold_out' : 'available';

  await connection.query(
    'UPDATE sponsorship_inventory SET available_quantity = ?, reservation_status = ? WHERE id = ?',
    [newAvailable, newStatus, inventoryId]
  );

  // 3. Insert reservation record
  const [result] = await connection.query(
    `INSERT INTO inventory_reservations (inventory_id, agreement_id, proposal_id, sponsor_id, quantity, status, is_exclusive)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      inventoryId,
      agreementId,
      proposalId,
      sponsorId,
      quantity,
      agreementId ? 'confirmed_contracted' : 'reserved_pending',
      item.is_exclusive ? 1 : 0
    ]
  );

  return { reservationId: result.insertId, item, newAvailable };
}

/**
 * Release reserved inventory when a proposal is rejected or an agreement is cancelled.
 * Must run inside a MySQL transaction.
 */
export async function releaseInventoryForAgreement(connection, agreementId) {
  // Find all active reservations for this agreement
  const [reservations] = await connection.query(
    `SELECT * FROM inventory_reservations 
     WHERE agreement_id = ? AND status IN ('reserved_pending', 'confirmed_contracted') FOR UPDATE`,
    [agreementId]
  );

  for (const res of reservations) {
    // 1. Mark reservation as released
    await connection.query(
      "UPDATE inventory_reservations SET status = 'released', released_at = NOW() WHERE id = ?",
      [res.id]
    );

    // 2. Restore available_quantity on inventory item
    await connection.query(
      `UPDATE sponsorship_inventory 
       SET available_quantity = available_quantity + ?,
           reservation_status = IF(available_quantity + ? > 0, 'available', reservation_status)
       WHERE id = ?`,
      [res.quantity, res.quantity, res.inventory_id]
    );
  }

  return reservations.length;
}

/**
 * Release reservations for a proposal (e.g. when rejected or withdrawn)
 */
export async function releaseInventoryForProposal(connection, proposalId) {
  const [reservations] = await connection.query(
    `SELECT * FROM inventory_reservations 
     WHERE proposal_id = ? AND status = 'reserved_pending' FOR UPDATE`,
    [proposalId]
  );

  for (const res of reservations) {
    await connection.query(
      "UPDATE inventory_reservations SET status = 'released', released_at = NOW() WHERE id = ?",
      [res.id]
    );

    await connection.query(
      `UPDATE sponsorship_inventory 
       SET available_quantity = available_quantity + ?,
           reservation_status = 'available'
       WHERE id = ?`,
      [res.quantity, res.inventory_id]
    );
  }

  return reservations.length;
}
