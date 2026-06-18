import { Router } from 'express';
import db from '../db.js';
import type { RepairOrder, RepairStatus, PaymentMethod } from '../../shared/types.js';

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

function getCommunications(repairId: number) {
  return db
    .prepare(
      `SELECT * FROM communication_logs WHERE repairId = ? ORDER BY createdAt DESC`
    )
    .all(repairId);
}

function getPayments(repairId: number) {
  return db
    .prepare(`SELECT * FROM repair_payments WHERE repairId = ? ORDER BY createdAt DESC`)
    .all(repairId);
}

function mapRowToRepairOrder(row: any): RepairOrder {
  return {
    ...row,
    customerConfirmed: Boolean(row.customerConfirmed),
    paid: Boolean(row.paid),
    partsUsed: getPartsForRepair(row.id),
    communications: getCommunications(row.id),
    payments: getPayments(row.id),
  };
}

function generateReceipt(repair: any, partsTotal: number, laborFee: number, totalAmount: number, paymentMethod: string, paidAmount: number, payments: any[]): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const lines: string[] = [
    `══════════════════════════════════`,
    `         维修店收款收据`,
    `══════════════════════════════════`,
    ``,
    `收据编号：RCPT-${String(repair.id).padStart(4,'0')}`,
    `日    期：${dateStr}`,
    ``,
    `客户信息：${repair.customerName || '未登记'} / ${repair.customerPhone}`,
    `设备型号：${repair.deviceType} ${repair.deviceModel}`,
    `故障描述：${repair.faultDescription}`,
    ``,
    `────── 费用明细 ──────`,
  ];

  if (repair.partsUsed && repair.partsUsed.length > 0) {
    lines.push(`【零件费】`);
    for (const p of repair.partsUsed) {
      lines.push(`  ${p.partName} x${p.quantity}  ${p.unitPrice}  = ¥${(p.quantity * p.unitPrice).toFixed(2)}`);
    }
  }
  lines.push(`  零件费小计：¥${partsTotal.toFixed(2)}`);
  lines.push(`【工时费】¥${laborFee.toFixed(2)}`);
  lines.push(``);
  lines.push(`  总    计：¥${totalAmount.toFixed(2)}`);
  if (payments && payments.length > 0) {
    lines.push(`────── 收款记录 ──────`);
    for (const pay of payments) {
      const m = pay.method === 'cash' ? '现金' : pay.method === 'wechat' ? '微信' : pay.method === 'alipay' ? '支付宝' : pay.method;
      lines.push(`  ${m}  ¥${Number(pay.amount).toFixed(2)}  ${new Date(pay.createdAt).toLocaleString('zh-CN')}`);
    }
  }
  lines.push(``);
  lines.push(`  已 收 款：¥${paidAmount.toFixed(2)}`);
  const unpaid = totalAmount - paidAmount;
  lines.push(`  待 收 款：¥${unpaid > 0 ? unpaid.toFixed(2) : '0.00'}`);
  lines.push(``);
  lines.push(`付款方式：${paymentMethod === 'cash' ? '现金' : paymentMethod === 'wechat' ? '微信' : paymentMethod === 'alipay' ? '支付宝' : '未付款'}`);
  lines.push(``);
  lines.push(`══════════════════════════════════`);
  lines.push(`        感谢惠顾，欢迎再来！`);
  lines.push(`══════════════════════════════════`);
  return lines.join('\n');
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

router.get('/warranty-expiring', (_req, res) => {
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const rows = db
    .prepare(
      `SELECT * FROM repair_orders 
       WHERE status = 'completed' 
         AND warrantyExpires IS NOT NULL 
         AND warrantyExpires >= ? 
         AND warrantyExpires <= ?
       ORDER BY warrantyExpires ASC`
    )
    .all(now.toISOString(), in30Days.toISOString());
  const orders = (rows as any[]).map(mapRowToRepairOrder);
  res.json(orders);
});

router.get('/awaiting-return-visit', (_req, res) => {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const threshold = fiveDaysAgo.toISOString();

  const rows = db
    .prepare(
      `SELECT ro.* FROM repair_orders ro
       WHERE ro.status = 'completed' 
         AND ro.completedAt < ?
         AND NOT EXISTS (
           SELECT 1 FROM communication_logs cl 
           WHERE cl.repairId = ro.id AND cl.type = 'return_visit'
         )
       ORDER BY ro.completedAt ASC`
    )
    .all(threshold);
  const orders = (rows as any[]).map(mapRowToRepairOrder);
  res.json(orders);
});

router.get('/unpaid', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM repair_orders 
       WHERE status = 'completed' AND paid = 0
       ORDER BY completedAt ASC`
    )
    .all();
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
  if (!customerPhone || !customerPhone.trim()) {
    res.status(400).json({ error: '客户电话不能为空' });
    return;
  }
  if (!deviceModel || !deviceModel.trim()) {
    res.status(400).json({ error: '设备型号不能为空' });
    return;
  }
  if (!faultDescription || !faultDescription.trim()) {
    res.status(400).json({ error: '故障描述不能为空' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO repair_orders 
       (customerPhone, customerName, deviceType, deviceModel, faultDescription, faultType, receivedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(customerPhone.trim(), customerName || null, deviceType, deviceModel.trim(), faultDescription.trim(), faultType || null, new Date().toISOString());

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
    'warrantyExpires',
    'relatedRepairId',
  ];
  const updates: string[] = [];
  const values: any[] = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if ((f === 'quotedPrice' || f === 'laborFee') && typeof req.body[f] === 'number' && req.body[f] < 0) {
        res.status(400).json({ error: `${f === 'quotedPrice' ? '报价' : '工时费'}不能为负数` });
        return;
      }
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

  const existing = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  if (status === 'repairing' && !existing.customerConfirmed) {
    res.status(400).json({ error: '客户未确认报价，无法开始维修' });
    return;
  }

  if (status === 'repairing' && (!existing.repairPlan || !existing.quotedPrice)) {
    res.status(400).json({ error: '请先填写维修方案和报价' });
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

  if (!partId) {
    res.status(400).json({ error: '请选择要添加的零件' });
    return;
  }
  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: '零件数量必须大于 0' });
    return;
  }

  const repair = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id) as any;
  if (!repair) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  if (repair.status !== 'repairing') {
    res.status(400).json({ error: '只有维修中的工单才能添加零件，请先确认客户报价并开始维修' });
    return;
  }

  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(partId) as any;
  if (!part) {
    res.status(404).json({ error: '零件不存在' });
    return;
  }
  if (part.stock < quantity) {
    res.status(400).json({ error: `零件库存不足，当前库存 ${part.stock} 个` });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO repair_parts (repairId, partId, quantity, unitPrice) VALUES (?, ?, ?, ?)').run(
      id,
      partId,
      quantity,
      part.unitPrice
    );
    db.prepare('UPDATE parts SET stock = stock - ? WHERE id = ?').run(quantity, partId);
    db.prepare(
      'INSERT INTO inventory_transactions (partId, type, quantity, repairId, purchaseOrderId, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(partId, 'repair_use', quantity, id, null, `维修单#${id} 使用 ${part.name}`, new Date().toISOString());
  });
  tx();

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.delete('/:id/parts/:partUsageId', (req, res) => {
  const { id, partUsageId } = req.params;

  const rp = db.prepare('SELECT * FROM repair_parts WHERE id = ? AND repairId = ?').get(partUsageId, id) as any;
  if (!rp) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }

  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(rp.partId) as any;

  const tx = db.transaction(() => {
    db.prepare('UPDATE parts SET stock = stock + ? WHERE id = ?').run(rp.quantity, rp.partId);
    db.prepare('DELETE FROM repair_parts WHERE id = ?').run(partUsageId);
    db.prepare(
      'INSERT INTO inventory_transactions (partId, type, quantity, repairId, purchaseOrderId, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(rp.partId, 'repair_return', rp.quantity, id, null, `维修单#${id} 退回 ${part?.name || '零件'}`, new Date().toISOString());
  });
  tx();

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.post('/:id/complete', (req, res) => {
  const { id } = req.params;
  const { laborFee, paymentMethod } = req.body;

  const existing = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  if (existing.status !== 'ready') {
    res.status(400).json({ error: '只有待取件状态才能完成结算' });
    return;
  }

  if (laborFee !== undefined && laborFee < 0) {
    res.status(400).json({ error: '工时费不能为负数' });
    return;
  }

  const method = paymentMethod || 'cash';
  const parts = getPartsForRepair(Number(id));
  const partsTotal = parts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const finalLaborFee = laborFee ?? 0;
  const totalAmount = partsTotal + finalLaborFee;
  const now = new Date().toISOString();

  const repairWithParts = { ...existing, partsUsed: parts };
  let paidAmount = 0;
  const payments: any[] = [];

  if (method !== 'unpaid') {
    db.prepare(
      'INSERT INTO repair_payments (repairId, amount, method, remark, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, totalAmount, method, '结算收款', now);
    paidAmount = totalAmount;
    payments.push({ id: 0, repairId: Number(id), amount: totalAmount, method, remark: '结算收款', createdAt: now });
  }

  const receipt = generateReceipt(repairWithParts, partsTotal, finalLaborFee, totalAmount, method, paidAmount, payments);

  db.prepare(
    `UPDATE repair_orders 
     SET laborFee = ?, totalAmount = ?, paid = ?, paymentMethod = ?, receipt = ?, status = 'completed', completedAt = ?
     WHERE id = ?`
  ).run(finalLaborFee, totalAmount, method === 'unpaid' ? 0 : 1, method, receipt, now, id);

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.post('/:id/pay', (req, res) => {
  const { id } = req.params;
  const { amount, method, remark } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ error: '收款金额必须大于 0' });
    return;
  }
  if (!method || method === 'unpaid') {
    res.status(400).json({ error: '请选择有效的收款方式' });
    return;
  }
  if (amount < 0) {
    res.status(400).json({ error: '收款金额不能为负数' });
    return;
  }

  const existing = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }
  if (existing.status !== 'completed') {
    res.status(400).json({ error: '只有已完成的维修单才能登记收款' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO repair_payments (repairId, amount, method, remark, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, amount, method, remark || null, now);

  const payments = getPayments(Number(id));
  const paidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalAmount = Number(existing.totalAmount || 0);
  const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;

  const parts = getPartsForRepair(Number(id));
  const partsTotal = parts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const repairWithParts = { ...existing, partsUsed: parts };
  const displayMethod = isFullyPaid ? method : existing.paymentMethod || method;
  const receipt = generateReceipt(repairWithParts, partsTotal, existing.laborFee || 0, totalAmount, displayMethod, paidAmount, payments);

  db.prepare(
    `UPDATE repair_orders SET paid = ?, paymentMethod = ?, receipt = ? WHERE id = ?`
  ).run(isFullyPaid ? 1 : existing.paid, isFullyPaid ? (method as PaymentMethod) : existing.paymentMethod, receipt, id);

  const row = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  res.json(mapRowToRepairOrder(row));
});

router.get('/:id/communications', (req, res) => {
  const { id } = req.params;
  const repair = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  if (!repair) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }
  const logs = db.prepare('SELECT * FROM communication_logs WHERE repairId = ? ORDER BY createdAt DESC').all(id);
  res.json(logs);
});

router.post('/:id/communications', (req, res) => {
  const { id } = req.params;
  const { type, content } = req.body;

  const repair = db.prepare('SELECT * FROM repair_orders WHERE id = ?').get(id);
  if (!repair) {
    res.status(404).json({ error: '维修单不存在' });
    return;
  }

  if (!type) {
    res.status(400).json({ error: '请选择沟通类型' });
    return;
  }
  if (!content || !content.trim()) {
    res.status(400).json({ error: '沟通内容不能为空' });
    return;
  }

  const info = db
    .prepare('INSERT INTO communication_logs (repairId, type, content, createdAt) VALUES (?, ?, ?, ?)')
    .run(id, type, content.trim(), new Date().toISOString());

  const log = db.prepare('SELECT * FROM communication_logs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(log);
});

router.delete('/:id/communications/:logId', (req, res) => {
  const { id, logId } = req.params;
  const log = db.prepare('SELECT * FROM communication_logs WHERE id = ? AND repairId = ?').get(logId, id);
  if (!log) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  db.prepare('DELETE FROM communication_logs WHERE id = ?').run(logId);
  res.json({ success: true });
});

export default router;
