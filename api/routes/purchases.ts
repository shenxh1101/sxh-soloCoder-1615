import { Router } from 'express';
import db from '../db.js';

const router = Router();

function getItemsForPurchase(purchaseOrderId: number) {
  return db
    .prepare(
      `SELECT poi.*, p.name as partName, p.model as partModel
       FROM purchase_order_items poi
       JOIN parts p ON poi.partId = p.id
       WHERE poi.purchaseOrderId = ?`
    )
    .all(purchaseOrderId);
}

function mapRowToPurchaseOrder(row: any) {
  return {
    ...row,
    items: getItemsForPurchase(row.id),
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM purchase_orders ORDER BY id DESC').all();
  res.json((rows as any[]).map(mapRowToPurchaseOrder));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: '采购单不存在' });
    return;
  }
  res.json(mapRowToPurchaseOrder(row));
});

router.post('/', (req, res) => {
  const { supplier, remark, items } = req.body;
  if (!supplier || !items || items.length === 0) {
    res.status(400).json({ error: '请填写供应商和采购零件' });
    return;
  }

  const tx = db.transaction(() => {
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    const info = db.prepare(
      'INSERT INTO purchase_orders (supplier, status, totalAmount, remark, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(supplier, 'pending', totalAmount, remark || null, new Date().toISOString());

    const poId = info.lastInsertRowid;
    for (const item of items) {
      db.prepare(
        'INSERT INTO purchase_order_items (purchaseOrderId, partId, quantity, unitPrice) VALUES (?, ?, ?, ?)'
      ).run(poId, item.partId, item.quantity, item.unitPrice);
    }

    return poId;
  });

  const poId = tx() as number;
  const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
  res.status(201).json(mapRowToPurchaseOrder(row));
});

router.post('/:id/confirm', (req, res) => {
  const { id } = req.params;
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
  if (!po) {
    res.status(404).json({ error: '采购单不存在' });
    return;
  }
  if (po.status !== 'pending') {
    res.status(400).json({ error: '只有待到货的采购单才能确认' });
    return;
  }

  const items = getItemsForPurchase(Number(id)) as any[];

  const tx = db.transaction(() => {
    for (const item of items) {
      db.prepare('UPDATE parts SET stock = stock + ? WHERE id = ?').run(item.quantity, item.partId);
      db.prepare(
        'INSERT INTO inventory_transactions (partId, type, quantity, repairId, purchaseOrderId, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(item.partId, 'purchase_in', item.quantity, null, id, `采购单#${id} 到货入库 ${item.partName || ''}`, new Date().toISOString());
    }
    db.prepare(
      'UPDATE purchase_orders SET status = ?, arrivedAt = ? WHERE id = ?'
    ).run('arrived', new Date().toISOString(), id);
  });
  tx();

  const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  res.json(mapRowToPurchaseOrder(row));
});

router.post('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
  if (!po) {
    res.status(404).json({ error: '采购单不存在' });
    return;
  }
  if (po.status !== 'pending') {
    res.status(400).json({ error: '只有待到货的采购单才能取消' });
    return;
  }
  db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run('cancelled', id);
  const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  res.json(mapRowToPurchaseOrder(row));
});

export default router;
