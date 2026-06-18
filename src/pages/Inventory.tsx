import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, AlertTriangle, Package, Search, PlusCircle, Edit3 } from "lucide-react";
import type { Part } from "~shared/types";
import { partsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Inventory() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState("");
  const [stockModal, setStockModal] = useState<Part | null>(null);
  const [stockQty, setStockQty] = useState(1);
  const [editModal, setEditModal] = useState<Part | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    loadParts();
  }, []);

  async function loadParts() {
    try {
      const data = await partsApi.list();
      setParts(data);
    } catch (e) {
      console.error(e);
    }
  }

  const filteredParts = parts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.model.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockParts = filteredParts.filter((p) => p.stock <= p.safetyStock);

  async function handleAddStock() {
    if (!stockModal || stockQty <= 0) return;
    try {
      await partsApi.addStock(stockModal.id, stockQty);
      setStockModal(null);
      setStockQty(1);
      loadParts();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function openEdit(part: Part) {
    setEditModal(part);
    setEditForm({
      name: part.name,
      model: part.model,
      category: part.category,
      safetyStock: part.safetyStock,
      unitPrice: part.unitPrice,
    });
  }

  async function handleSaveEdit() {
    if (!editModal) return;
    try {
      await partsApi.update(editModal.id, editForm);
      setEditModal(null);
      loadParts();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">零件库存</h1>
        <Link to="/inventory/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          新增零件
        </Link>
      </div>

      {lowStockParts.length > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">
                有 {lowStockParts.length} 种零件库存不足，请及时补货
              </p>
              <p className="text-sm text-amber-700">
                {lowStockParts.slice(0, 3).map((p) => p.name).join("、")}
                {lowStockParts.length > 3 && ` 等${lowStockParts.length}种`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索零件名称、型号、分类..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                零件信息
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                分类
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                当前库存
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                安全库存
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                单价
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                入库时间
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredParts.map((part) => {
              const isLow = part.stock <= part.safetyStock;
              return (
                <tr key={part.id} className={isLow ? "bg-amber-50/50" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isLow ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{part.name}</div>
                        <div className="text-xs text-gray-500">{part.model}</div>
                      </div>
                      {isLow && (
                        <span className="badge bg-amber-100 text-amber-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          库存不足
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{part.category || "-"}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`font-bold text-lg ${
                        isLow ? "text-amber-600" : "text-gray-900"
                      }`}
                    >
                      {part.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {part.safetyStock}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(part.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(part.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setStockModal(part);
                          setStockQty(1);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        入库
                      </button>
                      <button
                        onClick={() => openEdit(part)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        编辑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredParts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                  暂无零件数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {stockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              零件入库 - {stockModal.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              当前库存：<span className="font-medium text-gray-900">{stockModal.stock}</span>
            </p>
            <div className="mb-6">
              <label className="label">入库数量</label>
              <input
                type="number"
                min={1}
                value={stockQty}
                onChange={(e) => setStockQty(Math.max(1, Number(e.target.value)))}
                className="input"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStockModal(null)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleAddStock} className="btn-primary">
                确认入库
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">编辑零件</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">零件名称</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">型号</label>
                <input
                  type="text"
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">分类</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">安全库存</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.safetyStock}
                    onChange={(e) =>
                      setEditForm({ ...editForm, safetyStock: Number(e.target.value) })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">单价 (¥)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.unitPrice}
                    onChange={(e) =>
                      setEditForm({ ...editForm, unitPrice: Number(e.target.value) })
                    }
                    className="input"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleSaveEdit} className="btn-primary">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
