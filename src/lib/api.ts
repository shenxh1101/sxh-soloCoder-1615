import type { RepairOrder, Part, RepairStatus } from "~shared/types";

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
  complete: (id: number, laborFee: number) =>
    request<RepairOrder>(`/repairs/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ laborFee }),
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
  addStock: (id: number, quantity: number) =>
    request<Part>(`/parts/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }),
};

export const statisticsApi = {
  monthly: () => request<{ month: string; count: number }[]>(`/statistics/monthly`),
  faults: () => request<{ name: string; value: number }[]>(`/statistics/faults`),
  parts: () =>
    request<{ name: string; model: string; totalUsed: number; totalAmount: number }[]>(
      `/statistics/parts`
    ),
};
