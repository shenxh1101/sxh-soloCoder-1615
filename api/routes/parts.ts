import { Router } from 'express';
import db from '../db.js';
import type { Part } from '../../shared/types.js';

const router = Router();

function mapRow(row: any): Part {
  return row as Part;
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM parts ORDER BY category, name').all();
  res.json((rows as any[]).map(mapRow));
});

router.get('/low-stock', (_req, res) => {
  const rows = db.prepare('SELECT * FROM parts WHERE stock <= safetyStock ORDER BY stock ASC').all();
  res.json((rows as any[]).map(mapRow));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  res.json(mapRow(row));
});

router.get('/:id/transactions', (req, res) => {
  const { id } = req.params;
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  if (!part) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  const rows = db
    .prepare(
      `SELECT it.*, p.name as partName, p.model as partModel
       FROM inventory_transactions it
       JOIN parts p ON it.partId = p.id
       WHERE it.partId = ?
       ORDER BY it.createdAt DESC
       LIMIT 50`
    )
    .all(id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, model, category, stock, safetyStock, unitPrice } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: '零件名称不能为空' });
    return;
  }
  if (!model || !model.trim()) {
    res.status(400).json({ error: '零件型号不能为空' });
    return;
  }
  if (stock !== undefined && stock < 0) {
    res.status(400).json({ error: '初始库存不能为负数' });
    return;
  }
  if (safetyStock !== undefined && safetyStock < 0) {
    res.status(400).json({ error: '安全库存不能为负数' });
    return;
  }
  if (unitPrice !== undefined && unitPrice < 0) {
    res.status(400).json({ error: '单价不能为负数' });
    return;
  }
  const info = db
    .prepare(
      'INSERT INTO parts (name, model, category, stock, safetyStock, unitPrice, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(name.trim(), model.trim(), category || '', stock || 0, safetyStock || 5, unitPrice || 0, new Date().toISOString());
  const row = db.prepare('SELECT * FROM parts WHERE id = ?').get(info.lastInsertRowid);

  if ((stock || 0) > 0) {
    db.prepare(
      'INSERT INTO inventory_transactions (partId, type, quantity, repairId, purchaseOrderId, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(info.lastInsertRowid, 'manual_in', stock, null, null, `新零件入库：${name}`, new Date().toISOString());
  }

  res.status(201).json(mapRow(row));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  const fields = ['name', 'model', 'category', 'safetyStock', 'unitPrice'];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if ((f === 'safetyStock' || f === 'unitPrice') && typeof req.body[f] === 'number' && req.body[f] < 0) {
        res.status(400).json({ error: `${f === 'safetyStock' ? '安全库存' : '单价'}不能为负数` });
        return;
      }
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE parts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const row = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  res.json(mapRow(row));
});

router.post('/:id/stock', (req, res) => {
  const { id } = req.params;
  const { quantity, remark } = req.body;
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: '入库数量必须大于 0' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE parts SET stock = stock + ? WHERE id = ?').run(quantity, id);
    db.prepare(
      'INSERT INTO inventory_transactions (partId, type, quantity, repairId, purchaseOrderId, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, 'manual_in', quantity, null, null, remark || `手动入库 ${existing.name}`, new Date().toISOString());
  });
  tx();

  const row = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  res.json(mapRow(row));
});

export default router;
