import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'repair_shop.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repair_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerPhone TEXT NOT NULL,
      customerName TEXT,
      deviceType TEXT NOT NULL CHECK(deviceType IN ('电脑', '笔记本', '手机', '其他')),
      deviceModel TEXT NOT NULL,
      faultDescription TEXT NOT NULL,
      faultType TEXT,
      repairPlan TEXT,
      quotedPrice REAL,
      customerConfirmed INTEGER DEFAULT 0,
      laborFee REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending_check' CHECK(status IN ('pending_check', 'pending_confirm', 'repairing', 'ready', 'completed', 'cancelled')),
      receivedAt TEXT NOT NULL,
      readyAt TEXT,
      completedAt TEXT,
      totalAmount REAL,
      paid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      category TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      safetyStock INTEGER NOT NULL DEFAULT 5,
      unitPrice REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repair_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repairId INTEGER NOT NULL,
      partId INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unitPrice REAL NOT NULL,
      FOREIGN KEY (repairId) REFERENCES repair_orders(id),
      FOREIGN KEY (partId) REFERENCES parts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);
    CREATE INDEX IF NOT EXISTS idx_repair_orders_phone ON repair_orders(customerPhone);
    CREATE INDEX IF NOT EXISTS idx_repair_parts_repair ON repair_parts(repairId);
    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
  `);

  const partCount = db.prepare('SELECT COUNT(*) as count FROM parts').get() as { count: number };
  if (partCount.count === 0) {
    const insertPart = db.prepare(
      'INSERT INTO parts (name, model, category, stock, safetyStock, unitPrice, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    const parts = [
      ['DDR4 内存条', '8GB 3200MHz', '内存', 20, 5, 120, now],
      ['DDR4 内存条', '16GB 3200MHz', '内存', 12, 3, 220, now],
      ['笔记本屏幕', '15.6英寸 FHD IPS', '屏幕', 8, 3, 450, now],
      ['手机屏幕总成', 'iPhone 13 Pro', '屏幕', 3, 2, 850, now],
      ['笔记本电池', '通用型 4400mAh', '电池', 15, 5, 180, now],
      ['手机电池', 'iPhone 13', '电池', 10, 3, 120, now],
      ['固态硬盘', '500GB NVMe', '存储', 18, 5, 280, now],
      ['机械硬盘', '2TB 7200rpm', '存储', 6, 2, 320, now],
      ['电源适配器', '笔记本 19V 4.74A', '电源', 10, 3, 85, now],
      ['主板', 'B550M AM4', '主板', 3, 2, 680, now],
    ];
    const tx = db.transaction((partsData: unknown[][]) => {
      for (const p of partsData) insertPart.run(...p);
    });
    tx(parts);
  }

  const repairCount = db.prepare('SELECT COUNT(*) as count FROM repair_orders').get() as { count: number };
  if (repairCount.count === 0) {
    const insertRepair = db.prepare(
      `INSERT INTO repair_orders 
       (customerPhone, customerName, deviceType, deviceModel, faultDescription, faultType, 
        repairPlan, quotedPrice, customerConfirmed, laborFee, status, receivedAt, totalAmount, paid) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const daysAgo = (days: number, hours = 0) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      d.setHours(d.getHours() - hours);
      return d.toISOString();
    };

    const repairs = [
      ['13800138001', '张先生', '笔记本', 'ThinkPad T480', '开机无显示，电源指示灯不亮', '开不了机', '检测主板供电，更换电源芯片', 350, 1, 100, 'repairing', daysAgo(2), null, 0],
      ['13900139002', '李女士', '手机', 'iPhone 13', '屏幕摔碎，触摸正常', '屏幕碎了', '更换屏幕总成', 980, 1, 80, 'ready', daysAgo(4), 1060, 0],
      ['13700137003', '王经理', '电脑', '组装机 i7-10700', '运行卡顿，经常蓝屏', '系统故障', '重装系统，检测硬盘坏道，更换硬盘', 520, 1, 150, 'pending_confirm', daysAgo(1), null, 0],
      ['13600136004', '赵同学', '笔记本', 'MacBook Pro 2019', '电池鼓包，续航不足半小时', '电池问题', '更换电池', 580, 0, 50, 'pending_check', daysAgo(0, 5), null, 0],
      ['13500135005', '孙先生', '手机', '华为 Mate 40 Pro', '充电口松动，无法正常充电', '充电问题', '更换尾插', 180, 1, 50, 'completed', daysAgo(8), 230, 1],
    ];

    const tx = db.transaction((repairsData: unknown[][]) => {
      for (const r of repairsData) insertRepair.run(...r);
    });
    tx(repairs);

    const insertRepairPart = db.prepare(
      'INSERT INTO repair_parts (repairId, partId, quantity, unitPrice) VALUES (?, ?, ?, ?)'
    );
    const repairParts = [
      [1, 9, 1, 85],
      [2, 4, 1, 850],
      [5, 6, 1, 120],
    ];
    const tx2 = db.transaction((data: unknown[][]) => {
      for (const rp of data) insertRepairPart.run(...rp);
    });
    tx2(repairParts);
  }
}

initDatabase();

export default db;
