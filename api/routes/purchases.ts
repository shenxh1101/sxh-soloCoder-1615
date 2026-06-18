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

function getPaymentsForPurchase(purchaseOrderId: number) {
  return db
    .prepare('SELECT * FROM purchase_payments WHERE purchaseOrderId = ? ORDER BY createdAt')
    .all(purchaseOrderId);
}

function mapRowToPurchaseOrder(row: any) {
  return {
    ...row,
    isPaid: Boolean(row.isPaid),
    items: getItemsForPurchase(row.id),
    payments: getPaymentsForPurchase(row.id),
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
  const { supplier, supplierId, remark, items } = req.body;
  if (!supplier || !supplier.trim()) {
    res.status(400).json({ error: '请填写或选择供应商' });
    return;
  }
  if (!items || items.length === 0) {
    res.status(400).json({ error: '请至少添加一个采购零件' });
    return;
  }
  for (const item of items) {
    if (!item.partId) {
      res.status(400).json({ error: '请选择要采购的零件' });
      return;
    }
    if (!item.quantity || item.quantity <= 0) {
      res.status(400).json({ error: '采购数量必须大于 0' });
      return;
    }
    if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
      res.status(400).json({ error: '采购进价不能为负数' });
      return;
    }
  }

  const tx = db.transaction(() => {
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    const info = db.prepare(
      'INSERT INTO purchase_orders (supplier, supplierId, status, totalAmount, isPaid, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(supplier.trim(), supplierId || null, 'pending', totalAmount, 0, remark || null, new Date().toISOString());

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

router.post('/:id/pay', (req, res) => {
  const { id } = req.params;
  const { amount, method, remark } = req.body;

  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
  if (!po) {
    res.status(404).json({ error: '采购单不存在' });
    return;
  }
  if (po.status === 'cancelled') {
    res.status(400).json({ error: '已取消的采购单不能付款' });
    return;
  }

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: '付款金额必须大于 0' });
  }
  if (!method || !['cash', 'wechat', 'alipay'].includes(method)) {
    return res.status(400).json({ error: '请选择有效的付款方式' });
  }

  const payments = getPaymentsForPurchase(Number(id)) as any[];
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(po.totalAmount) - paidAmount;

  if (amt > remaining + 0.001) {
    return res.status(400).json({ error: `付款金额不能超过剩余应付 ¥${remaining.toFixed(2)}` });
  }

  const tx = db.transaction(() => {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO purchase_payments (purchaseOrderId, amount, method, remark, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(Number(id), amt, method, remark || null, now);

    const newPayments = getPaymentsForPurchase(Number(id)) as any[];
    const totalPaid = newPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const newRemaining = Number(po.totalAmount) - totalPaid;
    const isFullyPaid = newRemaining <= 0.001;

    db.prepare(
      `UPDATE purchase_orders SET isPaid = ?, paidAt = ? WHERE id = ?`
    ).run(isFullyPaid ? 1 : 0, isFullyPaid ? now : po.paidAt, id);

    db.prepare(`
      INSERT INTO financial_transactions
        (type, amount, method, purchaseOrderId, supplierName, remark, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('purchase_expense', amt, method, Number(id), po.supplier, remark || null, now);
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
