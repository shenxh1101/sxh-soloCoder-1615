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
      paid INTEGER DEFAULT 0,
      paymentMethod TEXT CHECK(paymentMethod IS NULL OR paymentMethod IN ('cash', 'wechat', 'alipay', 'unpaid')),
      receipt TEXT,
      warrantyExpires TEXT,
      relatedRepairId INTEGER
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

    CREATE TABLE IF NOT EXISTS communication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repairId INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (repairId) REFERENCES repair_orders(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partId INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      repairId INTEGER,
      purchaseOrderId INTEGER,
      remark TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (partId) REFERENCES parts(id),
      FOREIGN KEY (repairId) REFERENCES repair_orders(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier TEXT NOT NULL,
      supplierId INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'arrived', 'cancelled')),
      totalAmount REAL DEFAULT 0,
      isPaid INTEGER DEFAULT 0,
      remark TEXT,
      createdAt TEXT NOT NULL,
      arrivedAt TEXT,
      paidAt TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchaseOrderId INTEGER NOT NULL,
      partId INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unitPrice REAL NOT NULL,
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id),
      FOREIGN KEY (partId) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contactPhone TEXT,
      contactName TEXT,
      commonParts TEXT,
      remark TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repair_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repairId INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash', 'wechat', 'alipay')),
      remark TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (repairId) REFERENCES repair_orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);
    CREATE INDEX IF NOT EXISTS idx_repair_orders_phone ON repair_orders(customerPhone);
    CREATE INDEX IF NOT EXISTS idx_repair_parts_repair ON repair_parts(repairId);
    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
    CREATE INDEX IF NOT EXISTS idx_comm_logs_repair ON communication_logs(repairId);
    CREATE INDEX IF NOT EXISTS idx_inv_trans_part ON inventory_transactions(partId);
    CREATE INDEX IF NOT EXISTS idx_inv_trans_created ON inventory_transactions(createdAt);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchaseOrderId);
    CREATE INDEX IF NOT EXISTS idx_repair_payments_repair ON repair_payments(repairId);
  `);

  const colCheck = db.prepare("SELECT count(*) as cnt FROM pragma_table_info('repair_orders') WHERE name='paymentMethod'").get() as { cnt: number };
  if (colCheck.cnt === 0) {
    db.exec(`ALTER TABLE repair_orders ADD COLUMN paymentMethod TEXT CHECK(paymentMethod IS NULL OR paymentMethod IN ('cash', 'wechat', 'alipay', 'unpaid'))`);
    db.exec(`ALTER TABLE repair_orders ADD COLUMN receipt TEXT`);
    db.exec(`ALTER TABLE repair_orders ADD COLUMN warrantyExpires TEXT`);
    db.exec(`ALTER TABLE repair_orders ADD COLUMN relatedRepairId INTEGER`);
  }

  const poColCheck = db.prepare("SELECT count(*) as cnt FROM pragma_table_info('purchase_orders') WHERE name='isPaid'").get() as { cnt: number };
  if (poColCheck.cnt === 0) {
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN supplierId INTEGER`);
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN isPaid INTEGER DEFAULT 0`);
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN paidAt TEXT`);
  }

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

  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as { count: number };
  if (supplierCount.count === 0) {
    const insertSupplier = db.prepare(
      'INSERT INTO suppliers (name, contactPhone, contactName, commonParts, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    const suppliers = [
      ['深圳电子批发商', '0755-88881234', '王经理', '内存、硬盘、主板', '长期合作，价格合理', now],
      ['广州屏幕供应商', '020-66665678', '李总', '屏幕总成、电池', '屏幕质量好', now],
      ['北京配件中心', '010-55559999', '张工', '电源适配器、主板', '发货快', now],
    ];
    const tx = db.transaction((data: unknown[][]) => {
      for (const s of data) insertSupplier.run(...s);
    });
    tx(suppliers);
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

    db.prepare(`UPDATE repair_orders SET paymentMethod = 'wechat', warrantyExpires = ? WHERE id = 5`).run(
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    );

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

    const insertCommLog = db.prepare(
      'INSERT INTO communication_logs (repairId, type, content, createdAt) VALUES (?, ?, ?, ?)'
    );
    const commLogs = [
      [1, 'phone', '客户张先生来电询问维修进度，已告知正在维修中', daysAgo(1)],
      [1, 'quote_confirm', '报价350元，客户电话确认同意', daysAgo(1, 2)],
      [2, 'pickup_notify', '已电话通知客户取机，客户说明天来', daysAgo(1)],
      [3, 'quote_confirm', '报价520元，等待客户确认', daysAgo(0, 10)],
      [5, 'phone', '客户孙先生反馈充电恢复正常', daysAgo(6)],
      [5, 'pickup_notify', '通知客户取机，客户表示当天来取', daysAgo(7)],
      [5, 'return_visit', '回访：客户使用一周后反馈一切正常', daysAgo(3)],
    ];
    const tx3 = db.transaction((data: unknown[][]) => {
      for (const c of data) insertCommLog.run(...c);
    });
    tx3(commLogs);

    const insertInvTx = db.prepare(
      'INSERT INTO inventory_transactions (partId, type, quantity, repairId, purchaseOrderId, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const invTxs = [
      [9, 'repair_use', 1, 1, null, '维修单#1 使用电源适配器', daysAgo(2)],
      [4, 'repair_use', 1, 2, null, '维修单#2 使用手机屏幕总成', daysAgo(4)],
      [6, 'repair_use', 1, 5, null, '维修单#5 使用手机电池', daysAgo(8)],
      [1, 'purchase_in', 10, null, 1, '采购单#1 到货入库', daysAgo(10)],
      [7, 'purchase_in', 5, null, 1, '采购单#1 到货入库', daysAgo(10)],
    ];
    const tx4 = db.transaction((data: unknown[][]) => {
      for (const t of data) insertInvTx.run(...t);
    });
    tx4(invTxs);

    const insertPurchaseOrder = db.prepare(
      'INSERT INTO purchase_orders (supplier, supplierId, status, totalAmount, isPaid, remark, createdAt, arrivedAt, paidAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const purchaseOrders = [
      ['深圳电子批发商', 1, 'arrived', 1760, 1, '首次补货', daysAgo(12), daysAgo(10), daysAgo(9)],
      ['广州屏幕供应商', 2, 'pending', 1700, 0, '屏幕补货', daysAgo(1), null, null],
    ];
    const tx5 = db.transaction((data: unknown[][]) => {
      for (const p of data) insertPurchaseOrder.run(...p);
    });
    tx5(purchaseOrders);

    const insertPurchaseItem = db.prepare(
      'INSERT INTO purchase_order_items (purchaseOrderId, partId, quantity, unitPrice) VALUES (?, ?, ?, ?)'
    );
    const purchaseItems = [
      [1, 1, 10, 100],
      [1, 7, 5, 250],
      [2, 3, 5, 400],
      [2, 4, 1, 700],
    ];
    const tx6 = db.transaction((data: unknown[][]) => {
      for (const i of data) insertPurchaseItem.run(...i);
    });
    tx6(purchaseItems);
  }
}

initDatabase();

export default db;
