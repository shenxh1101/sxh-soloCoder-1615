import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShoppingCart, CheckCircle, XCircle, Search, Package, Truck, X, AlertTriangle, DollarSign, Users, FileText } from "lucide-react";
import type { Part, PurchaseOrder, Supplier, PaymentMethod, PurchasePayment } from "~shared/types";
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_COLORS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_COLORS } from "~shared/types";
import { purchasesApi, partsApi, suppliersApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

type TabType = "list" | "create";

const payMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "现金" },
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
];

export default function PurchaseOrders() {
  const [tab, setTab] = useState<TabType>("list");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [supplierText, setSupplierText] = useState("");
  const [poRemark, setPoRemark] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ partId: number; quantity: number; unitPrice: number }[]>([]);
  const [addPartId, setAddPartId] = useState<number | "">("");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payOrderId, setPayOrderId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payRemark, setPayRemark] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [orderData, partsData, supplierData] = await Promise.all([
        purchasesApi.list(),
        partsApi.list(),
        suppliersApi.list(),
      ]);
      setOrders(orderData);
      setAllParts(partsData);
      setSuppliers(supplierData);
    } catch (e) {
      console.error(e);
    }
  }

  function getPaidAmount(order: PurchaseOrder): number {
    const payments = order.payments || [];
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  function getUnpaidAmount(order: PurchaseOrder): number {
    return Number(order.totalAmount) - getPaidAmount(order);
  }

  function addPartToOrder() {
    if (!addPartId) return;
    const part = allParts.find((p) => p.id === Number(addPartId));
    if (!part) return;
    if (selectedItems.find((i) => i.partId === part.id)) return;
    setSelectedItems([...selectedItems, { partId: part.id, quantity: Math.max(part.safetyStock * 2 - part.stock, 1), unitPrice: part.unitPrice }]);
    setAddPartId("");
  }

  function removeItem(partId: number) {
    setSelectedItems(selectedItems.filter((i) => i.partId !== partId));
  }

  function updateItemQty(partId: number, quantity: number) {
    if (quantity < 1) quantity = 1;
    setSelectedItems(selectedItems.map((i) => i.partId === partId ? { ...i, quantity } : i));
  }

  function updateItemPrice(partId: number, unitPrice: number) {
    if (unitPrice < 0) unitPrice = 0;
    setSelectedItems(selectedItems.map((i) => i.partId === partId ? { ...i, unitPrice } : i));
  }

  async function handleCreate() {
    const finalSupplier = supplierId ? suppliers.find((s) => s.id === supplierId)?.name : supplierText;
    if (!finalSupplier || selectedItems.length === 0) {
      alert("请填写/选择供应商并选择采购零件");
      return;
    }
    for (const item of selectedItems) {
      if (!item.partId) { alert("请选择要采购的零件"); return; }
      if (item.quantity <= 0) { alert("采购数量必须大于 0"); return; }
      if (item.unitPrice < 0) { alert("采购进价不能为负数"); return; }
    }
    try {
      await purchasesApi.create({
        supplier: finalSupplier,
        supplierId: supplierId ? Number(supplierId) : undefined,
        remark: poRemark || undefined,
        items: selectedItems,
      });
      setSupplierId("");
      setSupplierText("");
      setPoRemark("");
      setSelectedItems([]);
      setTab("list");
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleConfirm(id: number) {
    if (!confirm("确认到货？零件将自动入库")) return;
    try {
      await purchasesApi.confirm(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("确定取消该采购单？")) return;
    try {
      await purchasesApi.cancel(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function openPayModal(order: PurchaseOrder) {
    const unpaid = getUnpaidAmount(order);
    if (unpaid <= 0.001) {
      alert("该采购单已全额付款");
      return;
    }
    setPayOrderId(order.id);
    setPayAmount(unpaid.toFixed(2));
    setPayMethod("cash");
    setPayRemark("");
    setShowPayModal(true);
  }

  async function handleSubmitPayment() {
    if (payOrderId === null) return;
    const amt = Number(payAmount);
    const order = orders.find((o) => o.id === payOrderId);
    if (!order) return;
    const unpaid = getUnpaidAmount(order);

    if (!amt || amt <= 0) {
      alert("付款金额必须大于 0");
      return;
    }
    if (amt > unpaid + 0.001) {
      alert(`付款金额不能超过剩余应付 ¥${unpaid.toFixed(2)}`);
      return;
    }
    if (!payMethod || payMethod === "unpaid") {
      alert("请选择付款方式");
      return;
    }

    try {
      await purchasesApi.pay(payOrderId, amt, payMethod, payRemark || undefined);
      setShowPayModal(false);
      setPayOrderId(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function addLowStockParts() {
    const lowStock = allParts.filter((p) => p.stock <= p.safetyStock);
    const newItems = lowStock
      .filter((p) => !selectedItems.find((i) => i.partId === p.id))
      .map((p) => ({ partId: p.id, quantity: Math.max(p.safetyStock * 2 - p.stock, 1), unitPrice: p.unitPrice }));
    if (newItems.length === 0) {
      alert("当前没有库存不足的零件");
      return;
    }
    setSelectedItems([...selectedItems, ...newItems]);
  }

  const totalAmount = selectedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const payOrder = payOrderId !== null ? orders.find((o) => o.id === payOrderId) : null;
  const payOrderUnpaid = payOrder ? getUnpaidAmount(payOrder) : 0;
  const payOrderPaid = payOrder ? getPaidAmount(payOrder) : 0;

  const availablePartsForSelect = allParts.filter(
    (p) => !selectedItems.find((i) => i.partId === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">采购管理</h1>
        <div className="flex items-center gap-3">
          <Link to="/suppliers" className="btn-secondary">
            <Users className="w-4 h-4" />
            供应商管理
          </Link>
          <Link to="/inventory" className="btn-secondary">
            <Package className="w-4 h-4" />
            返回库存
          </Link>
          <button
            onClick={() => setTab(tab === "create" ? "list" : "create")}
            className={tab === "create" ? "btn-secondary" : "btn-primary"}
          >
            <Plus className="w-4 h-4" />
            {tab === "create" ? "返回列表" : "新建采购单"}
          </button>
        </div>
      </div>

      {tab === "list" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="card p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无采购单</p>
            </div>
          ) : (
            orders.map((order) => {
              const paid = getPaidAmount(order);
              const unpaid = getUnpaidAmount(order);
              const payments = (order.payments || []) as PurchasePayment[];
              return (
                <div key={order.id} className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">采购单 #{order.id}</h3>
                      <span className={`badge ${PURCHASE_STATUS_COLORS[order.status]}`}>
                        {PURCHASE_STATUS_LABELS[order.status]}
                      </span>
                      {order.isPaid ? (
                        <span className="badge bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-0.5" />
                          已付清
                        </span>
                      ) : paid > 0 ? (
                        <span className="badge bg-amber-100 text-amber-700">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          部分付款
                        </span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          未付款
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      创建时间：{formatDate(order.createdAt, "long")}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">供应商：</span>
                      <span className="text-gray-900 font-medium">{order.supplier}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">总金额：</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    {paid > 0 && (
                      <>
                        <div>
                          <span className="text-gray-500">已付款：</span>
                          <span className="text-green-700 font-medium">{formatCurrency(paid)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">待付款：</span>
                          <span className="text-red-600 font-medium">{formatCurrency(unpaid)}</span>
                        </div>
                      </>
                    )}
                    {order.remark && (
                      <div className="col-span-2">
                        <span className="text-gray-500">备注：</span>
                        <span className="text-gray-700">{order.remark}</span>
                      </div>
                    )}
                    {order.arrivedAt && (
                      <div>
                        <span className="text-gray-500">到货时间：</span>
                        <span className="text-gray-900">{formatDate(order.arrivedAt, "long")}</span>
                      </div>
                    )}
                    {order.paidAt && (
                      <div>
                        <span className="text-gray-500">付清时间：</span>
                        <span className="text-gray-900">{formatDate(order.paidAt, "long")}</span>
                      </div>
                    )}
                  </div>

                  {payments.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> 付款记录
                      </div>
                      <div className="space-y-1.5">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              <span className={`badge text-xs py-0.5 ${(PAYMENT_METHOD_COLORS as any)[p.method]}`}>
                                {(PAYMENT_METHOD_LABELS as any)[p.method]}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(p.createdAt)}</span>
                              {p.remark && <span className="text-xs text-gray-500">— {p.remark}</span>}
                            </div>
                            <span className="font-medium text-green-700">-{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.items && order.items.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-gray-100 mb-4">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">零件</th>
                            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">型号</th>
                            <th className="text-center text-xs font-medium text-gray-500 px-4 py-2.5">数量</th>
                            <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">进价</th>
                            <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">小计</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{item.partName}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">{item.partModel}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="btn-danger text-sm py-1.5 px-4"
                        >
                          <XCircle className="w-3.5 h-3.5" /> 取消
                        </button>
                        <button
                          onClick={() => handleConfirm(order.id)}
                          className="btn-primary text-sm py-1.5 px-4"
                        >
                          <Truck className="w-3.5 h-3.5" /> 确认到货入库
                        </button>
                      </>
                    )}
                    {unpaid > 0.001 && order.status !== "cancelled" && (
                      <button
                        onClick={() => openPayModal(order)}
                        className="btn-primary text-sm py-1.5 px-4"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        {paid > 0 ? "继续付款" : "登记付款"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "create" && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">新建采购单</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">选择供应商（可选）</label>
              <select
                value={supplierId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    setSupplierId(Number(v));
                    setSupplierText("");
                  } else {
                    setSupplierId("");
                  }
                }}
                className="input"
              >
                <option value="">— 不选 / 手动输入 —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.contactPhone ? ` (${s.contactPhone})` : ""}</option>
                ))}
              </select>
              {!supplierId && (
                <input
                  type="text"
                  value={supplierText}
                  onChange={(e) => setSupplierText(e.target.value)}
                  className="input mt-2"
                  placeholder="或手动输入供应商名称"
                />
              )}
            </div>
            <div>
              <label className="label">备注（可选）</label>
              <input
                type="text"
                value={poRemark}
                onChange={(e) => setPoRemark(e.target.value)}
                className="input"
                placeholder="如：紧急补货等"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">采购零件</label>
              <button onClick={addLowStockParts} className="btn-secondary text-sm py-1 px-3">
                <AlertTriangle className="w-3.5 h-3.5" />
                一键添加库存不足零件
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <select
                value={addPartId}
                onChange={(e) => setAddPartId(Number(e.target.value) || "")}
                className="input flex-1"
              >
                <option value="">选择零件添加到采购单...</option>
                {availablePartsForSelect.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.model} (库存: {p.stock})
                  </option>
                ))}
              </select>
              <button onClick={addPartToOrder} disabled={!addPartId} className="btn-secondary">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedItems.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">零件</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-4 py-2.5">数量</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">进价</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">小计</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedItems.map((item) => {
                      const part = allParts.find((p) => p.id === item.partId);
                      return (
                        <tr key={item.partId}>
                          <td className="px-4 py-2.5">
                            <div className="text-sm font-medium text-gray-900">{part?.name}</div>
                            <div className="text-xs text-gray-500">{part?.model}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItemQty(item.partId, Number(e.target.value))}
                              className="input w-20 py-1 text-center text-sm"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.partId, Number(e.target.value))}
                              className="input w-24 py-1 text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => removeItem(item.partId)} className="text-red-500 hover:text-red-700">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-4 py-2.5 text-sm font-medium text-gray-700 text-right">合计</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-primary-600 text-right">{formatCurrency(totalAmount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                请选择要采购的零件
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => setTab("list")} className="btn-secondary">取消</button>
            <button
              onClick={handleCreate}
              disabled={!supplierId && !supplierText || selectedItems.length === 0}
              className="btn-primary"
            >
              <ShoppingCart className="w-4 h-4" />
              创建采购单 ({formatCurrency(totalAmount)})
            </button>
          </div>
        </div>
      )}

      {showPayModal && payOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">登记付款</h3>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">应付总额</span>
                  <span className="font-semibold text-amber-900">{formatCurrency(payOrder.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-amber-700">已付款</span>
                  <span className="font-semibold text-green-700">{formatCurrency(payOrderPaid)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-amber-200">
                  <span className="text-amber-700 font-medium">剩余应付</span>
                  <span className="font-bold text-red-600">{formatCurrency(payOrderUnpaid)}</span>
                </div>
              </div>
              <div>
                <label className="label">付款金额 (¥)</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  max={payOrderUnpaid}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="input text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  最多可付 <span className="font-medium text-red-600">{formatCurrency(payOrderUnpaid)}</span>
                </p>
              </div>
              <div>
                <label className="label">付款方式</label>
                <div className="grid grid-cols-3 gap-2">
                  {payMethodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPayMethod(opt.value)}
                      className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                        payMethod === opt.value
                          ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">备注（可选）</label>
                <input
                  type="text"
                  value={payRemark}
                  onChange={(e) => setPayRemark(e.target.value)}
                  placeholder="如：预付款、尾款等"
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPayModal(false)} className="btn-secondary flex-1">
                  取消
                </button>
                <button onClick={handleSubmitPayment} className="btn-primary flex-1">
                  <DollarSign className="w-4 h-4" />
                  确认付款
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
