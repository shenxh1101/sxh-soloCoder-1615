import { Router } from 'express';
import db from '../db.js';
import type { Supplier } from '../../shared/types.js';

const router = Router();

function mapRow(row: any): Supplier {
  return row as Supplier;
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all();
  res.json((rows as any[]).map(mapRow));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: '供应商不存在' });
    return;
  }
  res.json(mapRow(row));
});

router.get('/:id/purchases', (req, res) => {
  const { id } = req.params;
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!supplier) {
    res.status(404).json({ error: '供应商不存在' });
    return;
  }
  const rows = db
    .prepare('SELECT * FROM purchase_orders WHERE supplierId = ? ORDER BY id DESC')
    .all(id);
  const orders = (rows as any[]).map((row) => {
    const items = db
      .prepare(
        `SELECT poi.*, p.name as partName, p.model as partModel
         FROM purchase_order_items poi
         JOIN parts p ON poi.partId = p.id
         WHERE poi.purchaseOrderId = ?`
      )
      .all(row.id);
    return { ...row, isPaid: Boolean(row.isPaid), items };
  });
  res.json({ supplier: mapRow(supplier), purchases: orders });
});

router.post('/', (req, res) => {
  const { name, contactPhone, contactName, commonParts, remark } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: '供应商名称不能为空' });
    return;
  }
  const info = db
    .prepare(
      'INSERT INTO suppliers (name, contactPhone, contactName, commonParts, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      name.trim(),
      contactPhone || null,
      contactName || null,
      commonParts || null,
      remark || null,
      new Date().toISOString()
    );
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapRow(row));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '供应商不存在' });
    return;
  }
  const fields = ['name', 'contactPhone', 'contactName', 'commonParts', 'remark'];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f] || null);
    }
  }
  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  res.json(mapRow(row));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '供应商不存在' });
    return;
  }
  const poCount = db.prepare('SELECT COUNT(*) as cnt FROM purchase_orders WHERE supplierId = ?').get(id) as { cnt: number };
  if (poCount.cnt > 0) {
    res.status(400).json({ error: '该供应商存在关联采购单，无法删除' });
    return;
  }
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
