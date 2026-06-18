import express from 'express';
import db from '../db.js';
import type { FinancialTransaction } from '../../shared/types.js';

const router = express.Router();

function mapRowToFinancialTx(row: any): FinancialTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    method: row.method,
    repairId: row.repairId || undefined,
    purchaseOrderId: row.purchaseOrderId || undefined,
    customerName: row.customerName || undefined,
    supplierName: row.supplierName || undefined,
    remark: row.remark || undefined,
    createdAt: row.createdAt,
  };
}

function buildWhereClause(filters: any): { sql: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.startDate) {
    conditions.push('DATE(createdAt) >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('DATE(createdAt) <= ?');
    params.push(filters.endDate);
  }
  if (filters.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.method) {
    conditions.push('method = ?');
    params.push(filters.method);
  }
  if (filters.keyword) {
    conditions.push('(customerName LIKE ? OR supplierName LIKE ? OR remark LIKE ?)');
    const kw = '%' + filters.keyword + '%';
    params.push(kw, kw, kw);
  }

  return {
    sql: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params,
  };
}

router.get('/', (req, res) => {
  try {
    const { sql, params } = buildWhereClause(req.query);
    const rows = db.prepare(
      `SELECT * FROM financial_transactions ${sql} ORDER BY createdAt DESC LIMIT 200`
    ).all(...params) as any[];

    const transactions = rows.map(mapRowToFinancialTx);

    const summaryStmt = db.prepare(`
      SELECT
        method,
        type,
        SUM(amount) as total
      FROM financial_transactions
      ${sql}
      GROUP BY method, type
    `);
    const summaryRows = summaryStmt.all(...params) as any[];

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      byMethod: {} as Record<string, { income: number; expense: number }>,
    };

    for (const row of summaryRows) {
      const amount = Number(row.total);
      if (row.type === 'repair_income' || row.type === 'manual_income') {
        summary.totalIncome += amount;
        if (!summary.byMethod[row.method]) summary.byMethod[row.method] = { income: 0, expense: 0 };
        summary.byMethod[row.method].income += amount;
      } else {
        summary.totalExpense += amount;
        if (!summary.byMethod[row.method]) summary.byMethod[row.method] = { income: 0, expense: 0 };
        summary.byMethod[row.method].expense += amount;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const todayStmt = db.prepare(`
      SELECT method, type, SUM(amount) as total
      FROM financial_transactions
      WHERE DATE(createdAt) = ?
      GROUP BY method, type
    `);
    const todayRows = todayStmt.all(today) as any[];
    const todaySummary = {
      cash: 0,
      wechat: 0,
      alipay: 0,
    };
    for (const row of todayRows) {
      if (row.type === 'repair_income' || row.type === 'manual_income') {
        (todaySummary as any)[row.method] += Number(row.total);
      }
    }

    res.json({ transactions, summary, todaySummary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/daily', (req, res) => {
  try {
    const { startDate, endDate } = req.query as any;
    const { sql, params } = buildWhereClause({ startDate, endDate });

    const rows = db.prepare(`
      SELECT
        DATE(createdAt) as date,
        type,
        SUM(amount) as total
      FROM financial_transactions
      ${sql}
      GROUP BY DATE(createdAt), type
      ORDER BY date DESC
      LIMIT 30
    `).all(...params) as any[];

    res.json(rows.map((r) => ({
      date: r.date,
      type: r.type,
      total: Number(r.total),
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { type, amount, method, repairId, purchaseOrderId, customerName, supplierName, remark } = req.body;

    if (!type || !['repair_income', 'purchase_expense', 'manual_income', 'manual_expense'].includes(type)) {
      return res.status(400).json({ error: '请选择有效的收支类型' });
    }
    if (!method || !['cash', 'wechat', 'alipay'].includes(method)) {
      return res.status(400).json({ error: '请选择有效的收付款方式' });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: '金额必须大于 0' });
    }
    if ((type === 'manual_income' || type === 'manual_expense') && !remark?.trim()) {
      return res.status(400).json({ error: '手动收支请填写备注说明' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO financial_transactions
        (type, amount, method, repairId, purchaseOrderId, customerName, supplierName, remark, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, amt, method, repairId || null, purchaseOrderId || null,
      customerName || null, supplierName || null, remark || null, now);

    const tx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(result.lastInsertRowid) as any;
    res.json(mapRowToFinancialTx(tx));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const tx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(id) as any;
    if (!tx) return res.status(404).json({ error: '流水记录不存在' });
    if (tx.repairId || tx.purchaseOrderId) {
      return res.status(400).json({ error: '关联维修单/采购单的流水不能直接删除，请在对应页面操作' });
    }
    db.prepare('DELETE FROM financial_transactions WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
