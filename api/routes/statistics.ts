import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/monthly', (req, res) => {
  const { month } = req.query;
  if (month) {
    const rows = db
      .prepare(
        `SELECT * FROM repair_orders
         WHERE strftime('%Y-%m', receivedAt) = ? AND status != 'cancelled'
         ORDER BY receivedAt DESC`
      )
      .all(month as string);
    res.json(rows);
    return;
  }
  const rows = db
    .prepare(
      `SELECT 
        strftime('%Y-%m', receivedAt) as month,
        COUNT(*) as count
       FROM repair_orders
       WHERE status != 'cancelled'
       GROUP BY strftime('%Y-%m', receivedAt)
       ORDER BY month DESC
       LIMIT 12`
    )
    .all();
  res.json(rows.reverse());
});

router.get('/faults', (req, res) => {
  const { month } = req.query;
  let sql = `SELECT 
    COALESCE(faultType, '未分类') as name,
    COUNT(*) as value
   FROM repair_orders
   WHERE status != 'cancelled'`;
  const params: any[] = [];
  if (month) {
    sql += ' AND strftime(\'%Y-%m\', receivedAt) = ?';
    params.push(month);
  }
  sql += ' GROUP BY faultType ORDER BY value DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/parts', (req, res) => {
  const { month } = req.query;
  let sql = `SELECT 
    p.name,
    p.model,
    SUM(rp.quantity) as totalUsed,
    SUM(rp.quantity * rp.unitPrice) as totalAmount
   FROM repair_parts rp
   JOIN parts p ON rp.partId = p.id
   JOIN repair_orders ro ON rp.repairId = ro.id
   WHERE ro.status != 'cancelled'`;
  const params: any[] = [];
  if (month) {
    sql += ' AND strftime(\'%Y-%m\', ro.receivedAt) = ?';
    params.push(month);
  }
  sql += ' GROUP BY rp.partId ORDER BY totalUsed DESC LIMIT 10';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/summary', (req, res) => {
  const { month } = req.query;
  const m = month as string || new Date().toISOString().slice(0, 7);

  const repairCount = db.prepare(
    `SELECT COUNT(*) as count FROM repair_orders WHERE status != 'cancelled' AND strftime('%Y-%m', receivedAt) = ?`
  ).get(m) as { count: number };

  const completedCount = db.prepare(
    `SELECT COUNT(*) as count FROM repair_orders WHERE status = 'completed' AND strftime('%Y-%m', completedAt) = ?`
  ).get(m) as { count: number };

  const revenueRow = db.prepare(
    `SELECT COALESCE(SUM(totalAmount), 0) as total FROM repair_orders WHERE status = 'completed' AND strftime('%Y-%m', completedAt) = ?`
  ).get(m) as { total: number };

  const partsRevenue = db.prepare(
    `SELECT COALESCE(SUM(rp.quantity * rp.unitPrice), 0) as total
     FROM repair_parts rp
     JOIN repair_orders ro ON rp.repairId = ro.id
     WHERE ro.status != 'cancelled' AND strftime('%Y-%m', ro.receivedAt) = ?`
  ).get(m) as { total: number };

  const laborRevenue = db.prepare(
    `SELECT COALESCE(SUM(laborFee), 0) as total
     FROM repair_orders
     WHERE status = 'completed' AND strftime('%Y-%m', completedAt) = ?`
  ).get(m) as { total: number };

  res.json({
    month: m,
    repairCount: repairCount.count,
    completedCount: completedCount.count,
    totalRevenue: revenueRow.total,
    partsRevenue: partsRevenue.total,
    laborRevenue: laborRevenue.total,
  });
});

router.get('/export', (req, res) => {
  const { month } = req.query;
  const m = month as string || new Date().toISOString().slice(0, 7);

  const repairs = db.prepare(
    `SELECT * FROM repair_orders WHERE strftime('%Y-%m', receivedAt) = ? ORDER BY receivedAt DESC`
  ).all(m);

  const partsUsed = db.prepare(
    `SELECT rp.repairId, rp.quantity, rp.unitPrice, p.name as partName, p.model as partModel
     FROM repair_parts rp
     JOIN parts p ON rp.partId = p.id
     JOIN repair_orders ro ON rp.repairId = ro.id
     WHERE strftime('%Y-%m', ro.receivedAt) = ?`
  ).all(m);

  const faults = db.prepare(
    `SELECT COALESCE(faultType, '未分类') as name, COUNT(*) as value
     FROM repair_orders WHERE status != 'cancelled' AND strftime('%Y-%m', receivedAt) = ?
     GROUP BY faultType ORDER BY value DESC`
  ).all(m);

  const partsConsumption = db.prepare(
    `SELECT p.name, p.model, SUM(rp.quantity) as totalUsed, SUM(rp.quantity * rp.unitPrice) as totalAmount
     FROM repair_parts rp JOIN parts p ON rp.partId = p.id
     JOIN repair_orders ro ON rp.repairId = ro.id
     WHERE ro.status != 'cancelled' AND strftime('%Y-%m', ro.receivedAt) = ?
     GROUP BY rp.partId ORDER BY totalUsed DESC`
  ).all(m);

  const summary = db.prepare(
    `SELECT 
      COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as repairCount,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedCount,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN totalAmount ELSE 0 END), 0) as totalRevenue
     FROM repair_orders WHERE strftime('%Y-%m', receivedAt) = ?`
  ).get(m);

  res.json({
    month: m,
    summary,
    repairs,
    partsUsed,
    faults,
    partsConsumption,
    exportedAt: new Date().toISOString(),
  });
});

export default router;
