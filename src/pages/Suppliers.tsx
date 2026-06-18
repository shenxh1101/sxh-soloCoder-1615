import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Phone, User, FileText, Edit2, Trash2, Users, ShoppingCart, ChevronRight, CheckCircle, DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";
import type { Supplier, PurchaseOrder } from "~shared/types";
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_COLORS, PAYMENT_METHOD_LABELS } from "~shared/types";
import { suppliersApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

type TabType = "list" | "edit";

export default function Suppliers() {
  const [tab, setTab] = useState<TabType>("list");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactPhone: "",
    commonParts: "",
    remark: "",
  });
  const [viewingSupplier, setViewingSupplier] = useState<{ supplier: Supplier; purchases: PurchaseOrder[] } | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      const data = await suppliersApi.list();
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    }
  }

  function startCreate() {
    setEditing(null);
    setForm({ name: "", contactName: "", contactPhone: "", commonParts: "", remark: "" });
    setTab("edit");
  }

  function startEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      contactName: s.contactName || "",
      contactPhone: s.contactPhone || "",
      commonParts: s.commonParts || "",
      remark: s.remark || "",
    });
    setTab("edit");
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert("供应商名称不能为空");
      return;
    }
    try {
      if (editing) {
        await suppliersApi.update(editing.id, {
          name: form.name.trim(),
          contactName: form.contactName.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          commonParts: form.commonParts.trim() || undefined,
          remark: form.remark.trim() || undefined,
        });
      } else {
        await suppliersApi.create({
          name: form.name.trim(),
          contactName: form.contactName.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          commonParts: form.commonParts.trim() || undefined,
          remark: form.remark.trim() || undefined,
        });
      }
      setTab("list");
      loadSuppliers();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除该供应商？（有采购历史的供应商将无法删除）")) return;
    try {
      await suppliersApi.remove(id);
      loadSuppliers();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function loadPurchaseHistory(id: number) {
    try {
      const data = await suppliersApi.getWithPurchases(id);
      setViewingSupplier(data);
    } catch (e) {
      console.error(e);
    }
  }

  const totalPurchaseAmount = viewingSupplier?.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0) || 0;
  const totalPaidAmount = viewingSupplier?.purchases.reduce((sum, p) => {
    const paid = p.payments?.reduce((s, pm) => s + Number(pm.amount), 0) || 0;
    return sum + paid;
  }, 0) || 0;
  const totalUnpaidAmount = totalPurchaseAmount - totalPaidAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
        <div className="flex items-center gap-3">
          <Link to="/purchases" className="btn-secondary">
            <ShoppingCart className="w-4 h-4" />
            返回采购
          </Link>
          <button onClick={startCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增供应商
          </button>
        </div>
      </div>

      {tab === "list" && !viewingSupplier && (
        <div className="space-y-4">
          {suppliers.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无供应商，点击右上角新增</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {s.contactName && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{s.contactName}</span>
                      </div>
                    )}
                    {s.contactPhone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={"tel:" + s.contactPhone} className="hover:text-primary-600">{s.contactPhone}</a>
                      </div>
                    )}
                    {s.commonParts && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="line-clamp-2">{s.commonParts}</span>
                      </div>
                    )}
                    {s.remark && (
                      <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-500">
                        {s.remark}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => loadPurchaseHistory(s.id)}
                      className="w-full text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1"
                    >
                      查看采购历史 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewingSupplier && (
        <div className="space-y-4">
          <button
            onClick={() => setViewingSupplier(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 返回供应商列表
          </button>

          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">总采购额</p>
                  <p className="text-2xl font-bold text-blue-900 mt-0.5">{formatCurrency(totalPurchaseAmount)}</p>
                </div>
              </div>
            </div>
            <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">已付金额</p>
                  <p className="text-2xl font-bold text-green-900 mt-0.5">{formatCurrency(totalPaidAmount)}</p>
                </div>
              </div>
            </div>
            <div className="card p-5 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-600">未付金额</p>
                  <p className="text-2xl font-bold text-amber-900 mt-0.5">{formatCurrency(totalUnpaidAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{viewingSupplier.supplier.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {viewingSupplier.supplier.contactName}
                  {viewingSupplier.supplier.contactName && viewingSupplier.supplier.contactPhone && " - "}
                  {viewingSupplier.supplier.contactPhone}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                共 {viewingSupplier.purchases.length} 条采购记录
              </div>
            </div>
            {viewingSupplier.purchases.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                暂无采购记录
              </div>
            ) : (
              <div className="space-y-4">
                {viewingSupplier.purchases.map((p) => {
                  const statusColor = PURCHASE_STATUS_COLORS[p.status];
                  const statusLabel = PURCHASE_STATUS_LABELS[p.status];
                  const paid = p.payments?.reduce((s, pm) => s + Number(pm.amount), 0) || 0;
                  const unpaid = Number(p.totalAmount) - paid;
                  return (
                    <div key={p.id} className="p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">采购单 #{p.id}</span>
                          <span className={"badge " + statusColor}>{statusLabel}</span>
                          {paid >= Number(p.totalAmount) && p.payments && p.payments.length > 0 ? (
                            <span className="badge bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-0.5" />已付清
                            </span>
                          ) : paid > 0 ? (
                            <span className="badge bg-amber-100 text-amber-700 text-xs">
                              <DollarSign className="w-3 h-3 mr-0.5" />部分付款
                            </span>
                          ) : (
                            <span className="badge bg-red-100 text-red-700 text-xs">
                              <DollarSign className="w-3 h-3 mr-0.5" />未付款
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(p.totalAmount)}</div>
                          {paid > 0 && (
                            <div className="text-xs text-gray-500">
                              已付 {formatCurrency(paid)} / 待付 {formatCurrency(unpaid)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">
                        {formatDate(p.createdAt, "long")}
                        {p.remark && " - "}
                        {p.remark}
                      </div>
                      {p.payments && p.payments.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="text-xs font-medium text-gray-600">付款记录</div>
                          {p.payments.map((pm) => (
                            <div key={pm.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-white rounded border border-gray-200 text-gray-600">
                                  {PAYMENT_METHOD_LABELS[pm.method]}
                                </span>
                                <span className="text-gray-500">{formatDate(pm.createdAt, "long")}</span>
                                {pm.remark && <span className="text-gray-400">· {pm.remark}</span>}
                              </div>
                              <span className="font-medium text-green-600">-{formatCurrency(pm.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "edit" && (
        <div className="card p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editing ? "编辑供应商" : "新增供应商"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">供应商名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="如：深圳电子批发商"
              />
            </div>
            <div>
              <label className="label">联系人</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="input"
                placeholder="联系人姓名"
              />
            </div>
            <div>
              <label className="label">联系电话</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="input"
                placeholder="138..."
              />
            </div>
            <div className="col-span-2">
              <label className="label">常用零件</label>
              <input
                type="text"
                value={form.commonParts}
                onChange={(e) => setForm({ ...form, commonParts: e.target.value })}
                className="input"
                placeholder="主要供应哪些零件，如：笔记本屏幕、内存条等"
              />
            </div>
            <div className="col-span-2">
              <label className="label">备注</label>
              <textarea
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                className="input min-h-[80px]"
                placeholder="其他说明"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
            <button onClick={() => setTab("list")} className="btn-secondary">取消</button>
            <button onClick={handleSubmit} className="btn-primary">
              {editing ? "保存修改" : "创建供应商"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
