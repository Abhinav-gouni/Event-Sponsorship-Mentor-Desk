import pool from '../config/database.js';
import { calculateFinancials } from '../utils/financials.js';
import { checkInventoryAvailability } from '../services/inventoryService.js';

// --------------------------------------------------------------------
// INVENTORY CRUD
// --------------------------------------------------------------------
export async function getEventInventory(req, res, next) {
  try {
    const eventId = req.params.eventId;
    const [rows] = await pool.query(
      `SELECT i.*, 
        (SELECT COUNT(*) FROM inventory_reservations r WHERE r.inventory_id = i.id AND r.status IN ('reserved_pending', 'confirmed_contracted')) as active_reservations_count
       FROM sponsorship_inventory i
       WHERE i.event_id = ?
       ORDER BY i.is_exclusive DESC, i.base_price DESC`,
      [eventId]
    );

    const formatted = rows.map(r => ({
      ...r,
      category_restrictions: typeof r.category_restrictions === 'string'
        ? JSON.parse(r.category_restrictions || '[]')
        : r.category_restrictions || []
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
}

export async function createInventoryItem(req, res, next) {
  try {
    const {
      event_id, item_type, name, description,
      total_quantity = 1, base_price = 0, fulfilment_cost = 0,
      is_exclusive = false, category_restrictions
    } = req.body;

    if (!event_id || !item_type || !name) {
      return res.status(400).json({ success: false, message: 'Event ID, item type, and name are required' });
    }

    const TYPE_MAP = {
      'title': 'Title',
      'gold': 'Gold',
      'silver': 'Silver',
      'bronze': 'Bronze',
      'booth': 'Booth',
      'stage': 'Stage Branding',
      'stage branding': 'Stage Branding',
      'logo': 'Logo Placement',
      'logo placement': 'Logo Placement',
      'social': 'Social Media',
      'social media': 'Social Media',
      'speaking': 'Speaking Opportunity',
      'speaking opportunity': 'Speaking Opportunity',
      'digital': 'Digital Promotion',
      'digital promotion': 'Digital Promotion',
      'custom': 'Custom'
    };
    const normalizedType = TYPE_MAP[item_type.toLowerCase()] || item_type;

    const catJson = Array.isArray(category_restrictions)
      ? JSON.stringify(category_restrictions)
      : (category_restrictions || null);

    const [result] = await pool.query(
      `INSERT INTO sponsorship_inventory (
        event_id, item_type, name, description, total_quantity, available_quantity,
        base_price, fulfilment_cost, is_exclusive, category_restrictions, reservation_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
      [
        event_id, normalizedType, name, description || null,
        Number(total_quantity), Number(total_quantity),
        Number(base_price), Number(fulfilment_cost),
        is_exclusive ? 1 : 0, catJson
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: { id: result.insertId, name, base_price, is_exclusive }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryItem(req, res, next) {
  try {
    const id = req.params.id;
    const {
      item_type, name, description, total_quantity, available_quantity,
      base_price, fulfilment_cost, is_exclusive, category_restrictions, reservation_status
    } = req.body;

    const TYPE_MAP = {
      'title': 'Title',
      'gold': 'Gold',
      'silver': 'Silver',
      'bronze': 'Bronze',
      'booth': 'Booth',
      'stage': 'Stage Branding',
      'stage branding': 'Stage Branding',
      'logo': 'Logo Placement',
      'logo placement': 'Logo Placement',
      'social': 'Social Media',
      'social media': 'Social Media',
      'speaking': 'Speaking Opportunity',
      'speaking opportunity': 'Speaking Opportunity',
      'digital': 'Digital Promotion',
      'digital promotion': 'Digital Promotion',
      'custom': 'Custom'
    };
    const normalizedType = item_type ? (TYPE_MAP[item_type.toLowerCase()] || item_type) : null;

    const catJson = category_restrictions !== undefined
      ? (Array.isArray(category_restrictions) ? JSON.stringify(category_restrictions) : category_restrictions)
      : null;

    await pool.query(
      `UPDATE sponsorship_inventory SET
        item_type = COALESCE(?, item_type),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        total_quantity = COALESCE(?, total_quantity),
        available_quantity = COALESCE(?, available_quantity),
        base_price = COALESCE(?, base_price),
        fulfilment_cost = COALESCE(?, fulfilment_cost),
        is_exclusive = COALESCE(?, is_exclusive),
        category_restrictions = COALESCE(?, category_restrictions),
        reservation_status = COALESCE(?, reservation_status)
       WHERE id = ?`,
      [
        normalizedType, name, description, total_quantity, available_quantity,
        base_price, fulfilment_cost, is_exclusive !== undefined ? (is_exclusive ? 1 : 0) : null,
        catJson, reservation_status, id
      ]
    );

    res.json({ success: true, message: 'Inventory item updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteInventoryItem(req, res, next) {
  try {
    const id = req.params.id;

    // Check if reserved
    const [reservations] = await pool.query(
      "SELECT id FROM inventory_reservations WHERE inventory_id = ? AND status IN ('reserved_pending', 'confirmed_contracted')",
      [id]
    );

    if (reservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item with active sponsorship reservations or contract commitments.'
      });
    }

    await pool.query('DELETE FROM sponsorship_inventory WHERE id = ?', [id]);
    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (error) {
    next(error);
  }
}

// --------------------------------------------------------------------
// PACKAGES CRUD & PACKAGE BUILDER
// --------------------------------------------------------------------
export async function getEventPackages(req, res, next) {
  try {
    const eventId = req.params.eventId;
    const [packages] = await pool.query(
      'SELECT * FROM packages WHERE event_id = ? ORDER BY final_price DESC',
      [eventId]
    );

    // Fetch benefits for each package
    for (const pkg of packages) {
      const [benefits] = await pool.query(
        `SELECT pb.*, i.name as inventory_name, i.item_type, i.is_exclusive, i.available_quantity
         FROM package_benefits pb
         JOIN sponsorship_inventory i ON pb.inventory_id = i.id
         WHERE pb.package_id = ?`,
        [pkg.id]
      );
      pkg.benefits = benefits;
    }

    res.json({ success: true, data: packages });
  } catch (error) {
    next(error);
  }
}

export async function createPackage(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      event_id, name, description,
      discount = 0, additional_cost = 0,
      benefits = [] // array of { inventory_id, quantity, allocated_price, allocated_cost }
    } = req.body;

    if (!event_id || !name) {
      return res.status(400).json({ success: false, message: 'Event ID and package name are required' });
    }

    // Calculate aggregated base price & fulfilment cost from included benefits
    let totalBasePrice = 0;
    let totalFulfilmentCost = 0;

    for (const b of benefits) {
      const [invRows] = await connection.query('SELECT base_price, fulfilment_cost FROM sponsorship_inventory WHERE id = ?', [b.inventory_id]);
      if (invRows.length > 0) {
        const qty = b.quantity || 1;
        const bPrice = b.allocated_price !== undefined ? Number(b.allocated_price) : Number(invRows[0].base_price) * qty;
        const bCost = b.allocated_cost !== undefined ? Number(b.allocated_cost) : Number(invRows[0].fulfilment_cost) * qty;
        totalBasePrice += bPrice;
        totalFulfilmentCost += bCost;
      }
    }

    // Calculate authoritative financials
    const fin = calculateFinancials({
      basePrice: totalBasePrice,
      discount: Number(discount),
      additionalCost: Number(additional_cost),
      fulfilmentCost: totalFulfilmentCost
    });

    const [pkgResult] = await connection.query(
      `INSERT INTO packages (
        event_id, name, description, base_price, discount, additional_cost,
        fulfilment_cost, final_price, contribution, contribution_margin, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        event_id, name, description || null, fin.basePrice, fin.discount, fin.additionalCost,
        fin.fulfilmentCost, fin.revenue, fin.contribution, fin.contributionMargin
      ]
    );
    const packageId = pkgResult.insertId;

    // Insert benefits
    for (const b of benefits) {
      await connection.query(
        `INSERT INTO package_benefits (package_id, inventory_id, quantity, allocated_price, allocated_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [packageId, b.inventory_id, b.quantity || 1, b.allocated_price || 0, b.allocated_cost || 0]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: {
        id: packageId,
        name,
        ...fin
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

// --------------------------------------------------------------------
// WHAT-IF PRICING CALCULATOR
// --------------------------------------------------------------------
export async function calculateWhatIf(req, res, next) {
  try {
    const { basePrice, discount, additionalCost, fulfilmentCost, proposedPrice } = req.body;

    // Use authoritative financial utility
    const calculated = calculateFinancials({
      basePrice: Number(basePrice) || 0,
      discount: Number(discount) || 0,
      additionalCost: Number(additionalCost) || 0,
      fulfilmentCost: Number(fulfilmentCost) || 0,
      proposedPrice: proposedPrice !== undefined ? Number(proposedPrice) : null
    });

    res.json({
      success: true,
      data: {
        ...calculated,
        formulaExplanation: 'Contribution = Revenue - Fulfilment Cost; Margin = (Contribution / Revenue) * 100'
      }
    });
  } catch (error) {
    next(error);
  }
}
