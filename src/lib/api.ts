import type {
  RepairOrder,
  Part,
  RepairStatus,
  CommunicationType,
  PurchaseOrder,
  PaymentMethod,
  Supplier,
  RepairPayment,
  FinancialTransaction,
} from "~shared/types";

const API_BASE = "/api";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "请求失败");
  }
  return res.json();
}

export const repairsApi = {
  list: (params?: { status?: string; phone?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.phone) q.set("phone", params.phone);
    return request<RepairOrder[]>(`/repairs${q.toString() ? `?${q.toString()}` : ""}`);
  },
  get: (id: number) => request<RepairOrder>(`/repairs/${id}`),
  getOverdue: () => request<RepairOrder[]>(`/repairs/overdue`),
  getWarrantyExpiring: () => request<RepairOrder[]>(`/repairs/warranty-expiring`),
  getAwaitingReturnVisit: () => request<RepairOrder[]>(`/repairs/awaiting-return-visit`),
  getUnpaid: () => request<RepairOrder[]>(`/repairs/unpaid`),
  create: (data: Partial<RepairOrder>) =>
    request<RepairOrder>(`/repairs`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<RepairOrder>) =>
    request<RepairOrder>(`/repairs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateStatus: (id: number, status: RepairStatus) =>
    request<RepairOrder>(`/repairs/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  addPart: (id: number, partId: number, quantity: number) =>
    request<RepairOrder>(`/repairs/${id}/parts`, {
      method: "POST",
      body: JSON.stringify({ partId, quantity }),
    }),
  removePart: (id: number, partUsageId: number) =>
    request<RepairOrder>(`/repairs/${id}/parts/${partUsageId}`, { method: "DELETE" }),
  complete: (id: number, laborFee: number, paymentMethod: PaymentMethod) =>
    request<RepairOrder>(`/repairs/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ laborFee, paymentMethod }),
    }),
  pay: (id: number, amount: number, method: PaymentMethod, remark?: string) =>
    request<RepairOrder>(`/repairs/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ amount, method, remark }),
    }),
  addCommunication: (id: number, type: CommunicationType, content: string) =>
    request<any>(`/repairs/${id}/communications`, {
      method: "POST",
      body: JSON.stringify({ type, content }),
    }),
  listCommunications: (id: number) =>
    request<any[]>(`/repairs/${id}/communications`),
  deleteCommunication: (id: number, logId: number) =>
    request<any>(`/repairs/${id}/communications/${logId}`, { method: "DELETE" }),
  returnVisit: (id: number, content: string, satisfaction?: string) =>
    request<any>(`/repairs/${id}/return-visit`, {
      method: "POST",
      body: JSON.stringify({ content, satisfaction }),
    }),
  warrantyContacted: (id: number, content?: string) =>
    request<any>(`/repairs/${id}/warranty-contacted`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};

export const partsApi = {
  list: () => request<Part[]>(`/parts`),
  getLowStock: () => request<Part[]>(`/parts/low-stock`),
  get: (id: number) => request<Part>(`/parts/${id}`),
  create: (data: Partial<Part>) =>
    request<Part>(`/parts`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Part>) =>
    request<Part>(`/parts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  addStock: (id: number, quantity: number, remark?: string) =>
    request<Part>(`/parts/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ quantity, remark }),
    }),
  getTransactions: (id: number) =>
    request<any[]>(`/parts/${id}/transactions`),
};

export const purchasesApi = {
  list: () => request<PurchaseOrder[]>(`/purchases`),
  get: (id: number) => request<PurchaseOrder>(`/purchases/${id}`),
  create: (data: {
    supplier: string;
    supplierId?: number;
    remark?: string;
    items: { partId: number; quantity: number; unitPrice: number }[];
  }) =>
    request<PurchaseOrder>(`/purchases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  confirm: (id: number) =>
    request<PurchaseOrder>(`/purchases/${id}/confirm`, { method: "POST" }),
  pay: (id: number, amount: number, method: PaymentMethod, remark?: string) =>
    request<PurchaseOrder>(`/purchases/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ amount, method, remark }),
    }),
  cancel: (id: number) =>
    request<PurchaseOrder>(`/purchases/${id}/cancel`, { method: "POST" }),
};

export const suppliersApi = {
  list: () => request<Supplier[]>(`/suppliers`),
  get: (id: number) => request<Supplier>(`/suppliers/${id}`),
  getWithPurchases: (id: number) =>
    request<{ supplier: Supplier; purchases: PurchaseOrder[] }>(`/suppliers/${id}/purchases`),
  create: (data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/suppliers/${id}`, { method: "DELETE" }),
};

export const statisticsApi = {
  monthly: () => request<{ month: string; count: number }[]>(`/statistics/monthly`),
  faults: (month?: string) =>
    request<{ name: string; value: number }[]>(
      `/statistics/faults${month ? `?month=${month}` : ""}`
    ),
  parts: (month?: string) =>
    request<{ name: string; model: string; totalUsed: number; totalAmount: number }[]>(
      `/statistics/parts${month ? `?month=${month}` : ""}`
    ),
  summary: (month?: string) =>
    request<{
      month: string;
      repairCount: number;
      completedCount: number;
      totalRevenue: number;
      partsRevenue: number;
      laborRevenue: number;
    }>(`/statistics/summary${month ? `?month=${month}` : ""}`),
  exportReport: (month?: string) =>
    request<any>(`/statistics/export${month ? `?month=${month}` : ""}`),
};

export const financialApi = {
  list: (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    method?: string;
    keyword?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    if (params?.type) q.set("type", params.type);
    if (params?.method) q.set("method", params.method);
    if (params?.keyword) q.set("keyword", params.keyword);
    return request<{
      transactions: FinancialTransaction[];
      summary: {
        totalIncome: number;
        totalExpense: number;
        byMethod: Record<string, { income: number; expense: number }>;
      };
      todaySummary: {
        cash: number;
        wechat: number;
        alipay: number;
      };
    }>(`/financial${q.toString() ? `?${q.toString()}` : ""}`);
  },
  create: (data: {
    type: string;
    amount: number;
    method: PaymentMethod;
    customerName?: string;
    supplierName?: string;
    remark: string;
  }) =>
    request<FinancialTransaction>(`/financial`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/financial/${id}`, { method: "DELETE" }),
  daily: (params?: { startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return request<{ date: string; type: string; total: number }[]>(
      `/financial/daily${q.toString() ? `?${q.toString()}` : ""}`
    );
  },
};

export type { RepairPayment, FinancialTransaction };
