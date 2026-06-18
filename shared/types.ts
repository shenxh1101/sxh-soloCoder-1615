export type RepairStatus =
  | 'pending_check'
  | 'pending_confirm'
  | 'repairing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type DeviceType = '电脑' | '笔记本' | '手机' | '其他';

export interface RepairPart {
  id: number;
  repairId: number;
  partId: number;
  partName: string;
  partModel?: string;
  quantity: number;
  unitPrice: number;
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
