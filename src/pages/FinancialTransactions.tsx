import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, X, Search, Filter, Trash2, RefreshCw } from "lucide-react";
import type { FinancialTransaction, PaymentMethod, FinancialTxType } from "~shared/types";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_COLORS,
  FINANCIAL_TX_TYPE_LABELS,
  FINANCIAL_TX_TYPE_COLORS,
} from "~shared/types";
import { financialApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancialTransactions() {
  const [data, setData] = useState<{
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
  } | null>(null);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    method: "",
    keyword: "",
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    type: "manual_expense" as FinancialTxType | "",
    amount: "",
    method: "cash" as PaymentMethod,
    customerName: "",
    supplierName: "",
    remark: "",
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.type) params.type = filters.type;
      if (filters.method) params.method = filters.method;
      if (filters.keyword) params.keyword = filters.keyword;
      const result = await financialApi.list(params);
      setData(result);
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ startDate: "", endDate: "", type: "", method: "", keyword: "" });
  }

  async function handleAdd() {
    if (!addForm.type) { alert("请选择收支类型"); return; }
    const amt = Number(addForm.amount);
    if (!amt || amt <= 0) { alert("金额必须大于 0"); return; }
    if (!addForm.method || addForm.method === "unpaid") { alert("请选择收付款方式"); return; }
    if ((addForm.type === "manual_income" || addForm.type === "manual_expense") && !addForm.remark.trim()) {
      alert("手动收支请填写备注说明"); return;
    }

    try {
      await financialApi.create({
        type: addForm.type,
        amount: amt,
        method: addForm.method,
        customerName: addForm.customerName.trim() || undefined,
        supplierName: addForm.supplierName.trim() || undefined,
        remark: addForm.remark.trim(),
      });
      setShowAddModal(false);
      setAddForm({ type: "manual_expense", amount: "", method: "cash", customerName: "", supplierName: "", remark: "" });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除该流水记录？")) return;
    try {
      await financialApi.remove(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const netIncome = data ? data.summary.totalIncome - data.summary.totalExpense : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">收支流水</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          手动记账
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日收入合计</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(data.todaySummary.cash + data.todaySummary.wechat + data.todaySummary.alipay)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">现金收款</span>
                <span className="font-medium text-green-700">{formatCurrency(data.todaySummary.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">微信收款</span>
                <span className="font-medium text-green-700">{formatCurrency(data.todaySummary.wechat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">支付宝收款</span>
                <span className="font-medium text-green-700">{formatCurrency(data.todaySummary.alipay)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总收入</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.totalIncome)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总支出</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.totalExpense)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">净收入</p>
                <p className={"text-2xl font-bold mt-1 " + (netIncome >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(netIncome)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">筛选条件</h3>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> 重置
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="label text-xs">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="input py-2 text-sm"
            />
          </div>
          <div>
            <label className="label text-xs">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="input py-2 text-sm"
            />
          </div>
          <div>
            <label className="label text-xs">收支类型</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="input py-2 text-sm"
            >
              <option value="">全部类型</option>
              <option value="repair_income">维修收款</option>
              <option value="purchase_expense">采购付款</option>
              <option value="manual_income">其他收入</option>
              <option value="manual_expense">其他支出</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">收付款方式</label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange("method", e.target.value)}
              className="input py-2 text-sm"
            >
              <option value="">全部方式</option>
              <option value="cash">现金</option>
              <option value="wechat">微信</option>
              <option value="alipay">支付宝</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">关键词搜索</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => handleFilterChange("keyword", e.target.value)}
                placeholder="客户/供应商/备注"
                className="input py-2 pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            流水明细
            {data && <span className="text-sm text-gray-500 ml-2">共 {data.transactions.length} 条</span>}
          </h3>
        </div>
        {data?.transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            暂无流水记录
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data?.transactions.map((tx) => {
              const isIncome = tx.type === "repair_income" || tx.type === "manual_income";
              return (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + (isIncome ? "bg-green-100" : "bg-red-100")}>
                      {isIncome ? (
                        <TrendingUp className={"w-5 h-5 " + (isIncome ? "text-green-600" : "text-red-600")} />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={"badge " + (FINANCIAL_TX_TYPE_COLORS as any)[tx.type]}>
                          {(FINANCIAL_TX_TYPE_LABELS as any)[tx.type]}
                        </span>
                        <span className={"badge " + (PAYMENT_METHOD_COLORS as any)[tx.method]}>
                          {(PAYMENT_METHOD_LABELS as any)[tx.method]}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {tx.customerName || tx.supplierName || tx.remark || "—"}
                        {tx.repairId && <span className="text-gray-400 ml-2">维修单 #{tx.repairId}</span>}
                        {tx.purchaseOrderId && <span className="text-gray-400 ml-2">采购单 #{tx.purchaseOrderId}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDate(tx.createdAt, "long")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={"text-lg font-bold " + (isIncome ? "text-green-600" : "text-red-600")}>
                        {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                      </div>
                      {tx.remark && (
                        <div className="text-xs text-gray-400">{tx.remark}</div>
                      )}
                    </div>
                    {(tx.type === "manual_income" || tx.type === "manual_expense") && (
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">手动记账</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">收支类型 *</label>
                <select
                  value={addForm.type}
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value as any })}
                  className="input"
                >
                  <option value="">请选择</option>
                  <option value="manual_income">其他收入</option>
                  <option value="manual_expense">其他支出</option>
                </select>
              </div>
              <div>
                <label className="label">金额 (¥) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  className="input"
                  placeholder="请输入金额"
                />
              </div>
              <div>
                <label className="label">收付款方式 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "wechat", "alipay"] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, method: m })}
                      className={
                        "py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border " +
                        (addForm.method === m
                          ? "bg-primary-500 text-white border-primary-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300")
                      }
                    >
                      {PAYMENT_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">客户（可选）</label>
                <input
                  type="text"
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  className="input"
                  placeholder="客户姓名"
                />
              </div>
              <div>
                <label className="label">供应商（可选）</label>
                <input
                  type="text"
                  value={addForm.supplierName}
                  onChange={(e) => setAddForm({ ...addForm, supplierName: e.target.value })}
                  className="input"
                  placeholder="供应商名称"
                />
              </div>
              <div>
                <label className="label">备注 *</label>
                <textarea
                  value={addForm.remark}
                  onChange={(e) => setAddForm({ ...addForm, remark: e.target.value })}
                  className="input min-h-[60px]"
                  placeholder="请填写收支说明"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleAdd} className="btn-primary">
                确认记账
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
