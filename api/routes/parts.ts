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

router.post('/', (req, res) => {
  const { name, model, category, stock, safetyStock, unitPrice } = req.body;
  const info = db
    .prepare(
      'INSERT INTO parts (name, model, category, stock, safetyStock, unitPrice, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(name, model, category || '', stock || 0, safetyStock || 5, unitPrice || 0, new Date().toISOString());
  const row = db.prepare('SELECT * FROM parts WHERE id = ?').get(info.lastInsertRowid);
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
  const { quantity } = req.body;
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  db.prepare('UPDATE parts SET stock = stock + ? WHERE id = ?').run(quantity, id);
  const row = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
  res.json(mapRow(row));
});

export default router;
