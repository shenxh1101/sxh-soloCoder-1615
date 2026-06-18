export type RepairStatus =
  | 'pending_check'
  | 'pending_confirm'
  | 'repairing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type DeviceType = '电脑' | '笔记本' | '手机' | '其他';

export type CommunicationType = 'phone' | 'quote_confirm' | 'pickup_notify' | 'note' | 'warranty' | 'return_visit';

export type InventoryTxType = 'repair_use' | 'manual_in' | 'repair_return' | 'purchase_in';

export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'unpaid';
export type FinancialTxType = 'repair_income' | 'purchase_expense' | 'manual_income' | 'manual_expense';

export type PurchaseOrderStatus = 'pending' | 'arrived' | 'cancelled';

export interface RepairPart {
  id: number;
  repairId: number;
  partId: number;
  partName: string;
  partModel?: string;
  quantity: number;
  unitPrice: number;
}

export interface CommunicationLog {
  id: number;
  repairId: number;
  type: CommunicationType;
  content: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: number;
  partId: number;
  type: InventoryTxType;
  quantity: number;
  repairId?: number;
  purchaseOrderId?: number;
  remark?: string;
  createdAt: string;
  partName?: string;
  partModel?: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  partId: number;
  partName?: string;
  partModel?: string;
  quantity: number;
  unitPrice: number;
}

export interface Supplier {
  id: number;
  name: string;
  contactPhone?: string;
  contactName?: string;
  commonParts?: string;
  remark?: string;
  createdAt: string;
}

export interface RepairPayment {
  id: number;
  repairId: number;
  amount: number;
  method: PaymentMethod;
  remark?: string;
  createdAt: string;
}

export interface PurchasePayment {
  id: number;
  purchaseOrderId: number;
  amount: number;
  method: PaymentMethod;
  remark?: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: number;
  type: FinancialTxType;
  amount: number;
  method: PaymentMethod;
  repairId?: number;
  purchaseOrderId?: number;
  customerName?: string;
  supplierName?: string;
  remark?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: number;
  supplier: string;
  supplierId?: number;
  status: PurchaseOrderStatus;
  totalAmount: number;
  isPaid: boolean;
  remark?: string;
  createdAt: string;
  arrivedAt?: string;
  paidAt?: string;
  items: PurchaseOrderItem[];
  payments?: PurchasePayment[];
}

export interface RepairOrder {
  id: number;
  customerPhone: string;
  customerName?: string;
  deviceType: DeviceType;
  deviceModel: string;
  faultDescription: string;
  faultType?: string;
  repairPlan?: string;
  quotedPrice?: number;
  customerConfirmed: boolean;
  laborFee: number;
  status: RepairStatus;
  receivedAt: string;
  readyAt?: string;
  completedAt?: string;
  totalAmount?: number;
  paid: boolean;
  paymentMethod?: PaymentMethod;
  receipt?: string;
  warrantyExpires?: string;
  relatedRepairId?: number;
  partsUsed: RepairPart[];
  communications?: CommunicationLog[];
  payments?: RepairPayment[];
}

export interface Part {
  id: number;
  name: string;
  model: string;
  category: string;
  stock: number;
  safetyStock: number;
  unitPrice: number;
  createdAt: string;
}

export const STATUS_LABELS: Record<RepairStatus, string> = {
  pending_check: '待检查',
  pending_confirm: '待确认',
  repairing: '维修中',
  ready: '待取件',
  completed: '已完成',
  cancelled: '已取消',
};

export const STATUS_COLORS: Record<RepairStatus, string> = {
  pending_check: 'bg-gray-100 text-gray-700',
  pending_confirm: 'bg-blue-100 text-blue-700',
  repairing: 'bg-teal-100 text-teal-700',
  ready: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const COMM_TYPE_LABELS: Record<CommunicationType, string> = {
  phone: '电话沟通',
  quote_confirm: '报价确认',
  pickup_notify: '取件通知',
  note: '备注',
  warranty: '保修记录',
  return_visit: '售后回访',
};

export const COMM_TYPE_COLORS: Record<CommunicationType, string> = {
  phone: 'bg-blue-100 text-blue-700',
  quote_confirm: 'bg-green-100 text-green-700',
  pickup_notify: 'bg-amber-100 text-amber-700',
  note: 'bg-gray-100 text-gray-700',
  warranty: 'bg-purple-100 text-purple-700',
  return_visit: 'bg-teal-100 text-teal-700',
};

export const INV_TX_TYPE_LABELS: Record<InventoryTxType, string> = {
  repair_use: '维修扣减',
  manual_in: '手动入库',
  repair_return: '维修退回',
  purchase_in: '采购入库',
};

export const INV_TX_TYPE_COLORS: Record<InventoryTxType, string> = {
  repair_use: 'text-red-600',
  manual_in: 'text-green-600',
  repair_return: 'text-blue-600',
  purchase_in: 'text-purple-600',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  unpaid: '未付款',
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: 'bg-green-100 text-green-700',
  wechat: 'bg-emerald-100 text-emerald-700',
  alipay: 'bg-blue-100 text-blue-700',
  unpaid: 'bg-red-100 text-red-700',
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: '待到货',
  arrived: '已到货',
  cancelled: '已取消',
};

export const PURCHASE_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  arrived: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export const FINANCIAL_TX_TYPE_LABELS: Record<FinancialTxType, string> = {
  repair_income: '维修收款',
  purchase_expense: '采购付款',
  manual_income: '其他收入',
  manual_expense: '其他支出',
};

export const FINANCIAL_TX_TYPE_COLORS: Record<FinancialTxType, string> = {
  repair_income: 'bg-green-100 text-green-700',
  purchase_expense: 'bg-red-100 text-red-700',
  manual_income: 'bg-blue-100 text-blue-700',
  manual_expense: 'bg-orange-100 text-orange-700',
};

export const FAULT_TYPES = [
  '开不了机',
  '屏幕碎了',
  '系统故障',
  '电池问题',
  '充电问题',
  '进水',
  '声音问题',
  '网络问题',
  '其他',
];
