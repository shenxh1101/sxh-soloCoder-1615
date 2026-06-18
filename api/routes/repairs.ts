import { Router } from 'express';
import db from '../db.js';
import type { RepairOrder, RepairStatus } from '../../shared/types.js';

const router = Router();

function getPartsForRepair(repairId: number) {
  return db
    .prepare(
      `SELECT rp.id, rp.repairId, rp.partId, rp.quantity, rp.unitPrice, 
              p.name as partName, p.model as partModel
       FROM repair_parts rp
       JOIN parts p ON rp.partId = p.id
       WHERE rp.repairId = ?`
    )
    .all(repairId) as RepairOrder['partsUsed'];
}

function mapRowToRepairOrder(row: any): RepairOrder {
  return {
    ...row,
    customerConfirmed: Boolean(row.customerConfirmed),
    paid: Boolean(row.paid),
    partsUsed: getPartsForRepair(row.id),
  };
}

router.get('/', (req, res) => {
  const { status, phone } = req.query;
  let sql = 'SELECT * FROM repair_orders WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (phone) {
    sql += ' AND customerPhone LIKE ?';
    params.push(`%${phone}%`);
  }

  sql += ' ORDER BY id DESC';
  const rows = db.prepare(sql).all(...params);
  const orders = (rows as any[]).map(mapRowToRepairOrder);
  res.json(orders);
});

router.get('/overdue', (_req, res) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threshold = threeDaysAgo.toISOString();

  const rows = db
    .prepare(
      `SELECT * FROM repair_orders 
       WHERE status = 'ready' AND readyAt < ?
       ORDER BY readyAt ASC`
    )
    .all(threshold);
  const orders = (rows as any[]).map(mapRowToRepairOrder);
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }
  res.json(mapRowToRepairOrder(row));
});

router.post('/', (req, res) => {
  const { customerPhone, customerName, deviceType, deviceModel, faultDescription, faultType } = req.body;
  const info = db
    .prepare(
      `INSERT INTO repair_orders 
       (customerPhone, customerName, deviceType, deviceModel, faultDescription, faultType, receivedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(customerPhone, customerName, deviceType, deviceModel, faultDescription, faultType, new Date().toISOString());

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapRowToRepairOrder(row));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  const fields = [
    'customerPhone',
    'customerName',
    'deviceType',
    'deviceModel',
    'faultDescription',
    'faultType',
    'repairPlan',
    'quotedPrice',
    'laborFee',
    'customerConfirmed',
  ];
  const updates: string[] = [];
  const values: any[] = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'customerConfirmed' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE repair_orders SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: RepairStatus };

  const existing = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  const now = new Date().toISOString();
  let sql = 'UPDATE repair_orders SET status = ?';
  const params: any[] = [status];

  if (status === 'ready') {
    sql += ', readyAt = ?';
    params.push(now);
  }
  if (status === 'completed') {
    sql += ', completedAt = ?';
    params.push(now);
  }

  sql += ' WHERE id = ?';
  params.push(id);
  db.prepare(sql).run(...params);

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.post('/:id/parts', (req, res) => {
  const { id } = req.params;
  const { partId, quantity } = req.body;

  const repair = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  if (!repair) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(partId);
  if (!part) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  if ((part as any).stock < quantity) {
    res.status(400).json({ error: '零件库存不足' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO repair_parts (repairId, partId, quantity, unitPrice) VALUES (?, ?, ?, ?)').run(
      id,
      partId,
      quantity,
      (part as any).unitPrice
    );
    db.prepare('UPDATE parts SET stock = stock - ? WHERE id = ?').run(quantity, partId);
  });
  tx();

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.delete('/:id/parts/:partId', (req, res) => {
  const { id, partId } = req.params;

  const rp = db.prepare('SELECT * FROM repair_parts WHERE id = ? AND repairId = ?').get(partId, id);
  if (!rp) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE parts SET stock = stock + ? WHERE id = ?').run((rp as any).quantity, (rp as any).partId);
    db.prepare('DELETE FROM repair_parts WHERE id = ?').run(partId);
  });
  tx();

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.post('/:id/complete', (req, res) => {
  const { id } = req.params;
  const { laborFee } = req.body;

  const parts = getPartsForRepair(Number(id));
  const partsTotal = parts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const totalAmount = partsTotal + (laborFee ?? 0);
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE repair_orders 
     SET laborFee = ?, totalAmount = ?, paid = 1, status = 'completed', completedAt = ?
     WHERE id = ?`
  ).run(laborFee ?? 0, totalAmount, now, id);

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

export default router;
