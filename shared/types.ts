export type RepairStatus =
  | 'pending_check'
  | 'pending_confirm'
  | 'repairing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type DeviceType = '电脑' | '笔记本' | '手机' | '其他';

export type CommunicationType = 'phone' | 'quote_confirm' | 'pickup_notify' | 'note';

export type InventoryTxType = 'repair_use' | 'manual_in' | 'repair_return';

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
  remark?: string;
  createdAt: string;
  partName?: string;
  partModel?: string;
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
  partsUsed: RepairPart[];
  communications?: CommunicationLog[];
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
};

export const COMM_TYPE_COLORS: Record<CommunicationType, string> = {
  phone: 'bg-blue-100 text-blue-700',
  quote_confirm: 'bg-green-100 text-green-700',
  pickup_notify: 'bg-amber-100 text-amber-700',
  note: 'bg-gray-100 text-gray-700',
};

export const INV_TX_TYPE_LABELS: Record<InventoryTxType, string> = {
  repair_use: '维修扣减',
  manual_in: '手动入库',
  repair_return: '维修退回',
};

export const INV_TX_TYPE_COLORS: Record<InventoryTxType, string> = {
  repair_use: 'text-red-600',
  manual_in: 'text-green-600',
  repair_return: 'text-blue-600',
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
