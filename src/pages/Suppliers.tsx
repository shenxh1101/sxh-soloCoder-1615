import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Phone, User, FileText, Edit2, Trash2, Users, ShoppingCart, ChevronRight, CheckCircle, DollarSign } from "lucide-react";
import type { Supplier, PurchaseOrder } from "~shared/types";
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_COLORS } from "~shared/types";
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
              <div className="text-right">
                <div className="text-sm text-gray-500">累计采购</div>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(totalPurchaseAmount)}</div>
              </div>
            </div>
            {viewingSupplier.purchases.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                暂无采购记录
              </div>
            ) : (
              <div className="space-y-3">
                {viewingSupplier.purchases.map((p) => {
                  const statusColor = PURCHASE_STATUS_COLORS[p.status];
                  const statusLabel = PURCHASE_STATUS_LABELS[p.status];
                  return (
                    <div key={p.id} className="p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">采购单 #{p.id}</span>
                          <span className={"badge " + statusColor}>{statusLabel}</span>
                          {p.isPaid ? (
                            <span className="badge bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-0.5" />已付款
                            </span>
                          ) : (
                            <span className="badge bg-red-100 text-red-700 text-xs">
                              <DollarSign className="w-3 h-3 mr-0.5" />未付款
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(p.totalAmount)}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(p.createdAt, "long")}
                        {p.remark && " - "}
                        {p.remark}
                      </div>
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
