import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/monthly', (_req, res) => {
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

router.get('/faults', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT 
        COALESCE(faultType, '未分类') as name,
        COUNT(*) as value
       FROM repair_orders
       WHERE status != 'cancelled'
       GROUP BY faultType
       ORDER BY value DESC`
    )
    .all();
  res.json(rows);
});

router.get('/parts', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT 
        p.name,
        p.model,
        SUM(rp.quantity) as totalUsed,
        SUM(rp.quantity * rp.unitPrice) as totalAmount
       FROM repair_parts rp
       JOIN parts p ON rp.partId = p.id
       GROUP BY rp.partId
       ORDER BY totalUsed DESC
       LIMIT 10`
    )
    .all();
  res.json(rows);
});

export default router;
