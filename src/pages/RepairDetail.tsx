import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  CheckCircle,
  Clock,
  Wrench,
  PackageCheck,
  XCircle,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  Save,
  Check,
  MessageSquare,
  Send,
  AlertOctagon,
  Receipt,
  Shield,
  RotateCcw,
  Calendar,
  DollarSign,
  X,
} from "lucide-react";
import type {
  RepairOrder,
  RepairStatus,
  Part,
  CommunicationType,
  PaymentMethod,
  RepairPayment,
} from "~shared/types";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  FAULT_TYPES,
  COMM_TYPE_LABELS,
  COMM_TYPE_COLORS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_COLORS,
} from "~shared/types";
import { repairsApi, partsApi } from "@/lib/api";
import { formatDate, formatCurrency, isOverdue } from "@/lib/utils";

const statusFlow: { status: RepairStatus; label: string; icon: any }[] = [
  { status: "pending_check", label: "待检查", icon: Clock },
  { status: "pending_confirm", label: "待确认", icon: AlertTriangle },
  { status: "repairing", label: "维修中", icon: Wrench },
  { status: "ready", label: "待取件", icon: PackageCheck },
  { status: "completed", label: "已完成", icon: CheckCircle },
];

const commTypeOptions: { value: CommunicationType; label: string }[] = [
  { value: "phone", label: "电话沟通" },
  { value: "quote_confirm", label: "报价确认" },
  { value: "pickup_notify", label: "取件通知" },
  { value: "warranty", label: "保修记录" },
  { value: "return_visit", label: "售后回访" },
  { value: "note", label: "备注" },
];

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "现金" },
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
  { value: "unpaid", label: "未付款" },
];

const payMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "现金" },
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
];

export default function RepairDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [repair, setRepair] = useState<RepairOrder | null>(null);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<number | "">("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [laborFeeInput, setLaborFeeInput] = useState(0);
  const [newCommType, setNewCommType] = useState<CommunicationType>("phone");
  const [newCommContent, setNewCommContent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [warrantyInput, setWarrantyInput] = useState("");
  const [relatedRepairInput, setRelatedRepairInput] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payRemark, setPayRemark] = useState("");

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    try {
      const [repairData, partsData] = await Promise.all([
        repairsApi.get(Number(id)),
        partsApi.list(),
      ]);
      setRepair(repairData);
      setAllParts(partsData);
      setLaborFeeInput(repairData.laborFee);
      setEditForm({
        repairPlan: repairData.repairPlan || "",
        quotedPrice: repairData.quotedPrice || 0,
        faultType: repairData.faultType || "",
        customerConfirmed: repairData.customerConfirmed,
        warrantyExpires: repairData.warrantyExpires ? repairData.warrantyExpires.split("T")[0] : "",
        relatedRepairId: repairData.relatedRepairId || "",
      });
      setWarrantyInput(repairData.warrantyExpires ? repairData.warrantyExpires.split("T")[0] : "");
      setRelatedRepairInput(repairData.relatedRepairId ? String(repairData.relatedRepairId) : "");
    } catch (e) {
      console.error(e);
    }
  }

  if (!repair) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const partsTotal = repair.partsUsed.reduce(
    (sum, p) => sum + p.quantity * p.unitPrice,
    0
  );
  const currentStepIndex = statusFlow.findIndex((s) => s.status === repair.status);
  const isRepairOverdue =
    repair.status === "ready" && repair.readyAt && isOverdue(repair.readyAt) > 3;

  const canStartRepair = repair.customerConfirmed && repair.repairPlan && repair.quotedPrice;
  const payments = (repair.payments || []) as RepairPayment[];
  const paidAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
  const unpaidAmount = (repair.totalAmount || 0) - paidAmount;
  const isWarrantyExpired = repair.warrantyExpires && new Date(repair.warrantyExpires) < new Date();

  async function handleStatusChange(newStatus: RepairStatus) {
    if (!id) return;
    try {
      const updated = await repairsApi.updateStatus(Number(id), newStatus);
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleAddPart() {
    if (!id || !selectedPartId) {
      alert("请选择要添加的零件");
      return;
    }
    if (partQuantity <= 0) {
      alert("零件数量必须大于 0");
      return;
    }
    try {
      const updated = await repairsApi.addPart(Number(id), Number(selectedPartId), partQuantity);
      setRepair(updated);
      setSelectedPartId("");
      setPartQuantity(1);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleRemovePart(partUsageId: number) {
    if (!id) return;
    if (!confirm("确定移除该零件？库存将自动退回")) return;
    try {
      const updated = await repairsApi.removePart(Number(id), partUsageId);
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSaveEdit() {
    if (!id) return;
    try {
      const data: any = { ...editForm };
      if (data.warrantyExpires === "") data.warrantyExpires = null;
      if (data.relatedRepairId === "" || data.relatedRepairId === undefined) data.relatedRepairId = null;
      if (data.quotedPrice !== undefined && data.quotedPrice < 0) {
        alert("报价不能为负数");
        return;
      }
      const updated = await repairsApi.update(Number(id), data);
      setRepair(updated);
      setEditMode(false);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSaveLaborFee() {
    if (!id) return;
    if (laborFeeInput < 0) {
      alert("工时费不能为负数");
      return;
    }
    try {
      const updated = await repairsApi.update(Number(id), { laborFee: laborFeeInput });
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleComplete() {
    if (!id) return;
    const total = partsTotal + laborFeeInput;
    if (!confirm(`确认完成结算？\n付款方式：${PAYMENT_METHOD_LABELS[paymentMethod]}\n总金额：${formatCurrency(total)}`)) return;
    try {
      await handleSaveLaborFee();
      const updated = await repairsApi.complete(Number(id), laborFeeInput, paymentMethod);
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleAddCommunication() {
    if (!id || !newCommContent.trim()) {
      alert("请输入沟通内容");
      return;
    }
    try {
      await repairsApi.addCommunication(Number(id), newCommType, newCommContent.trim());
      const updated = await repairsApi.get(Number(id));
      setRepair(updated);
      setNewCommContent("");
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDeleteCommunication(logId: number) {
    if (!id) return;
    if (!confirm("确定删除该沟通记录？")) return;
    try {
      await repairsApi.deleteCommunication(Number(id), logId);
      const updated = await repairsApi.get(Number(id));
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSaveWarranty() {
    if (!id) return;
    try {
      const updated = await repairsApi.update(Number(id), {
        warrantyExpires: warrantyInput || null,
        relatedRepairId: relatedRepairInput ? Number(relatedRepairInput) : null,
      });
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSubmitPayment() {
    if (!id) return;
    const remaining = unpaidAmount > 0 ? unpaidAmount : (repair.totalAmount || 0);
    if (!payAmount || payAmount <= 0) {
      alert("收款金额必须大于 0");
      return;
    }
    if (payAmount > remaining + 0.001) {
      alert(`收款金额不能超过剩余应收 ¥${remaining.toFixed(2)}`);
      return;
    }
    if (!payMethod || payMethod === "unpaid") {
      alert("请选择收款方式");
      return;
    }
    try {
      const updated = await repairsApi.pay(Number(id), payAmount, payMethod, payRemark || undefined);
      setRepair(updated);
      setShowPayModal(false);
      setPayAmount(0);
      setPayRemark("");
    } catch (e: any) {
      alert(e.message);
    }
  }

  const availableParts = allParts.filter(
    (p) => p.stock > 0 && !repair.partsUsed.find((ru) => ru.partId === p.id)
  );

  const communications = repair.communications || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/repairs" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                维修单 #{repair.id}
              </h1>
              <span className={`badge ${STATUS_COLORS[repair.status]}`}>
                {STATUS_LABELS[repair.status]}
              </span>
              {isRepairOverdue && (
                <span className="badge bg-red-100 text-red-700 animate-pulse">
                  超期 {isOverdue(repair.readyAt!)} 天
                </span>
              )}
              {repair.relatedRepairId && (
                <Link
                  to={`/repairs/${repair.relatedRepairId}`}
                  className="badge bg-purple-100 text-purple-700 hover:bg-purple-200"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  返修自 #{repair.relatedRepairId}
                </Link>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {repair.deviceType} · {repair.deviceModel}
            </p>
          </div>
        </div>
        <a
          href={`tel:${repair.customerPhone}`}
          className="btn-primary"
        >
          <Phone className="w-4 h-4" />
          联系客户 {repair.customerPhone}
        </a>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">维修进度</h3>
        <div className="flex items-center justify-between">
          {statusFlow.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isCancelled = repair.status === "cancelled";
            const isBlocked =
              step.status === "repairing" && !canStartRepair && index > currentStepIndex;
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (
                        !isCancelled &&
                        repair.status !== "completed" &&
                        index <= currentStepIndex + 1 &&
                        !isBlocked
                      ) {
                        handleStatusChange(step.status);
                      }
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-primary-600 text-white ring-4 ring-primary-100"
                        : isBlocked
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : "bg-gray-100 text-gray-400"
                    } ${
                      !isCancelled &&
                      repair.status !== "completed" &&
                      index <= currentStepIndex + 1 &&
                      !isBlocked &&
                      index !== currentStepIndex
                        ? "cursor-pointer hover:scale-105"
                        : ""
                    }`}
                    disabled={
                      isCancelled ||
                      repair.status === "completed" ||
                      index > currentStepIndex + 1 ||
                      isBlocked
                    }
                  >
                    <step.icon className="w-5 h-5" />
                  </button>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCurrent ? "text-primary-700" : isDone ? "text-gray-700" : isBlocked ? "text-gray-300" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < statusFlow.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
          {repair.status === "cancelled" && (
            <div className="flex items-center ml-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <span className="mt-2 text-xs font-medium text-red-600">已取消</span>
              </div>
            </div>
          )}
        </div>
        {!canStartRepair && repair.status === "pending_confirm" && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              请先填写维修方案和报价，并勾选客户确认后，才能开始维修
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">客户与设备信息</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">客户姓名：</span>
                <span className="text-gray-900 font-medium">
                  {repair.customerName || "未登记"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">联系电话：</span>
                <a href={`tel:${repair.customerPhone}`} className="text-primary-600 font-medium">
                  {repair.customerPhone}
                </a>
              </div>
              <div>
                <span className="text-gray-500">设备类型：</span>
                <span className="text-gray-900 font-medium">{repair.deviceType}</span>
              </div>
              <div>
                <span className="text-gray-500">设备型号：</span>
                <span className="text-gray-900 font-medium">{repair.deviceModel}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">收机时间：</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(repair.receivedAt, "full")}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">故障与维修方案</h3>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  编辑
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="btn-secondary text-sm py-1.5 px-3">
                    取消
                  </button>
                  <button onClick={handleSaveEdit} className="btn-primary text-sm py-1.5 px-3">
                    <Save className="w-3.5 h-3.5" /> 保存
                  </button>
                </div>
              )}
            </div>
            {!editMode ? (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-gray-500">故障类型：</span>
                  <span className="text-gray-900 font-medium ml-2">
                    {repair.faultType || "未分类"}
                  </span>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">故障描述：</div>
                  <div className="text-gray-900 bg-gray-50 rounded-lg p-3">
                    {repair.faultDescription}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">维修方案：</div>
                  <div className="text-gray-900 bg-gray-50 rounded-lg p-3">
                    {repair.repairPlan || "尚未填写维修方案"}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-gray-500">报价：</span>
                    <span className="text-lg font-bold text-primary-600 ml-2">
                      {repair.quotedPrice ? formatCurrency(repair.quotedPrice) : "未报价"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">客户确认：</span>
                    {repair.customerConfirmed ? (
                      <span className="badge bg-green-100 text-green-700">
                        <Check className="w-3 h-3 mr-1" /> 已同意
                      </span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-600">未确认</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">故障类型</label>
                  <select
                    value={editForm.faultType}
                    onChange={(e) => setEditForm({ ...editForm, faultType: e.target.value })}
                    className="input"
                  >
                    <option value="">未分类</option>
                    {FAULT_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">维修方案</label>
                  <textarea
                    value={editForm.repairPlan}
                    onChange={(e) => setEditForm({ ...editForm, repairPlan: e.target.value })}
                    className="input min-h-[80px]"
                    placeholder="请填写维修方案..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">报价金额 (¥)</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.quotedPrice}
                      onChange={(e) =>
                        setEditForm({ ...editForm, quotedPrice: Number(e.target.value) })
                      }
                      className="input"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.customerConfirmed}
                        onChange={(e) =>
                          setEditForm({ ...editForm, customerConfirmed: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">客户已确认同意</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">保修到期日期</label>
                    <input
                      type="date"
                      value={editForm.warrantyExpires || ""}
                      onChange={(e) => setEditForm({ ...editForm, warrantyExpires: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">返修关联维修单号</label>
                    <input
                      type="number"
                      value={editForm.relatedRepairId || ""}
                      onChange={(e) => setEditForm({ ...editForm, relatedRepairId: e.target.value ? Number(e.target.value) : "" })}
                      className="input"
                      placeholder="原维修单号"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">使用零件</h3>
              {repair.status !== "repairing" && repair.partsUsed.length > 0 && (
                <span className="text-xs text-gray-400">
                  {repair.status === "pending_confirm" || repair.status === "pending_check"
                    ? "客户确认并开始维修后才能添加零件"
                    : ""}
                </span>
              )}
            </div>

            {repair.partsUsed.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-100 mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">
                        零件名称
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">
                        型号
                      </th>
                      <th className="text-center text-xs font-medium text-gray-500 px-4 py-2.5">
                        数量
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">
                        单价
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">
                        小计
                      </th>
                      {repair.status === "repairing" && (
                        <th className="text-center text-xs font-medium text-gray-500 px-4 py-2.5">
                          操作
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {repair.partsUsed.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {p.partName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.partModel}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {p.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(p.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(p.quantity * p.unitPrice)}
                        </td>
                        {repair.status === "repairing" && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemovePart(p.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg mb-4">
                {repair.status === "pending_confirm" || repair.status === "pending_check"
                  ? "客户确认并开始维修后可添加零件"
                  : "暂无使用零件"}
              </div>
            )}

            {repair.status === "repairing" && (
              <div className="flex items-end gap-3 pt-4 border-t border-gray-100">
                <div className="flex-1">
                  <label className="label">添加零件</label>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(Number(e.target.value) || "")}
                    className="input"
                  >
                    <option value="">选择零件...</option>
                    {availableParts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.model} (库存: {p.stock}, ¥{p.unitPrice})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="label">数量</label>
                  <input
                    type="number"
                    min={1}
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(Math.max(1, Number(e.target.value)))}
                    className="input"
                  />
                </div>
                <button
                  onClick={handleAddPart}
                  disabled={!selectedPartId}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">沟通记录</h3>
                <span className="text-sm text-gray-400">({communications.length})</span>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex gap-3">
                <select
                  value={newCommType}
                  onChange={(e) => setNewCommType(e.target.value as CommunicationType)}
                  className="input w-32"
                >
                  {commTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCommContent}
                  onChange={(e) => setNewCommContent(e.target.value)}
                  placeholder="输入沟通内容..."
                  className="input flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCommContent.trim()) {
                      handleAddCommunication();
                    }
                  }}
                />
                <button
                  onClick={handleAddCommunication}
                  disabled={!newCommContent.trim()}
                  className="btn-primary"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {communications.length > 0 ? (
              <div className="space-y-0">
                {communications.map((comm, index) => (
                  <div key={comm.id} className="relative pl-6 pb-4">
                    {index < communications.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full ${
                      comm.type === 'warranty' ? 'bg-purple-100 border-2 border-purple-400' :
                      comm.type === 'return_visit' ? 'bg-teal-100 border-2 border-teal-400' :
                      'bg-primary-100 border-2 border-primary-400'
                    }`} />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge text-xs ${COMM_TYPE_COLORS[comm.type]}`}>
                            {COMM_TYPE_LABELS[comm.type]}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(comm.createdAt, "long")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comm.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCommunication(comm.id)}
                        className="text-gray-300 hover:text-red-500 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                暂无沟通记录，添加第一条记录吧
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">
                {repair.status === "ready" ? "费用结算" : repair.status === "completed" ? "费用结算" : "费用预估"}
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">零件费</span>
                <span className="text-gray-900 font-medium">{formatCurrency(partsTotal)}</span>
              </div>
              {(repair.status === "ready" || repair.status === "repairing") ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">工时费</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={laborFeeInput}
                      onChange={(e) => setLaborFeeInput(Number(e.target.value))}
                      onBlur={handleSaveLaborFee}
                      className="w-28 input py-1 text-right"
                    />
                    <button
                      onClick={handleSaveLaborFee}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="保存工时费"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">工时费</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(repair.laborFee)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="text-gray-700 font-medium">
                  {repair.status === "ready" ? "总金额" : repair.status === "completed" ? "总金额" : "预估金额"}
                </span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(partsTotal + (repair.status === "ready" || repair.status === "repairing" ? laborFeeInput : repair.laborFee))}
                </span>
              </div>
              {repair.status === "completed" && (
                <>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-gray-500">已收款</span>
                    <span className="text-green-700 font-medium">{formatCurrency(paidAmount)}</span>
                  </div>
                  {unpaidAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">待收款</span>
                      <span className="text-red-600 font-medium">{formatCurrency(unpaidAmount)}</span>
                    </div>
                  )}
                  {repair.paymentMethod && (
                    <div className="flex items-center justify-between text-sm pt-2">
                      <span className="text-gray-500">付款方式</span>
                      <span className={`badge ${PAYMENT_METHOD_COLORS[repair.paymentMethod]}`}>
                        {PAYMENT_METHOD_LABELS[repair.paymentMethod]}
                      </span>
                    </div>
                  )}
                </>
              )}
              {repair.paid ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">已收款</span>
                  {repair.paymentMethod && repair.paymentMethod !== "unpaid" && (
                    <span className="text-sm">({PAYMENT_METHOD_LABELS[repair.paymentMethod]})</span>
                  )}
                </div>
              ) : repair.status === "ready" ? (
                <div className="space-y-3">
                  <div>
                    <label className="label text-xs">付款方式</label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                            paymentMethod === opt.value
                              ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleComplete} className="btn-primary w-full">
                    <CheckCircle className="w-4 h-4" />
                    完成结算收款
                  </button>
                </div>
              ) : repair.status === "completed" && !repair.paid ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 py-3 bg-red-50 rounded-lg text-red-700">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">待收款 {formatCurrency(unpaidAmount || repair.totalAmount || 0)}</span>
                  </div>
                  <button onClick={() => {
                    setPayAmount(unpaidAmount || repair.totalAmount || 0);
                    setShowPayModal(true);
                  }} className="btn-primary w-full">
                    <DollarSign className="w-4 h-4" />
                    登记收款
                  </button>
                </div>
              ) : repair.status === "repairing" ? (
                <div className="text-xs text-gray-400 text-center py-2">
                  维修中仅显示预估费用，完成维修后进入待取件再结算
                </div>
              ) : null}
              {payments.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="text-xs font-medium text-gray-500">收款记录</div>
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs py-0.5 ${PAYMENT_METHOD_COLORS[p.method]}`}>
                          {PAYMENT_METHOD_LABELS[p.method]}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(p.createdAt)}</span>
                      </div>
                      <span className="font-medium text-green-700">+{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {repair.status === "completed" && repair.receipt && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">收据</h3>
                </div>
                <button
                  onClick={() => setShowReceipt(!showReceipt)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  {showReceipt ? "收起" : "查看收据"}
                </button>
              </div>
              {showReceipt && (
                <pre className="text-xs bg-gray-50 rounded-lg p-4 font-mono whitespace-pre overflow-x-auto text-gray-700">
                  {repair.receipt}
                </pre>
              )}
            </div>
          )}

          {(repair.status === "completed" || repair.status === "ready") && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">保修与售后</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">保修到期</span>
                  {repair.warrantyExpires ? (
                    <span className={`font-medium ${isWarrantyExpired ? "text-red-600" : "text-green-600"}`}>
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      {formatDate(repair.warrantyExpires)}
                      {isWarrantyExpired ? " (已过期)" : " (保修中)"}
                    </span>
                  ) : (
                    <span className="text-gray-400">未设置</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={warrantyInput}
                    onChange={(e) => setWarrantyInput(e.target.value)}
                    className="input text-sm py-1.5 flex-1"
                  />
                  <button
                    onClick={handleSaveWarranty}
                    className="btn-secondary text-sm py-1.5 px-3"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
                {repair.relatedRepairId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">返修关联</span>
                    <Link
                      to={`/repairs/${repair.relatedRepairId}`}
                      className="text-primary-600 font-medium hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                      原单 #{repair.relatedRepairId}
                    </Link>
                  </div>
                )}
                <div>
                  <label className="label text-xs">关联原维修单号（返修时填写）</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={relatedRepairInput}
                      onChange={(e) => setRelatedRepairInput(e.target.value)}
                      className="input text-sm py-1.5 flex-1"
                      placeholder="原维修单号"
                    />
                    <button
                      onClick={handleSaveWarranty}
                      className="btn-secondary text-sm py-1.5 px-3"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">时间记录</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">收机时间</span>
                <span className="text-gray-900">{formatDate(repair.receivedAt, "long")}</span>
              </div>
              {repair.readyAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">修好时间</span>
                  <span className="text-gray-900">{formatDate(repair.readyAt, "long")}</span>
                </div>
              )}
              {repair.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">取机时间</span>
                  <span className="text-gray-900">{formatDate(repair.completedAt, "long")}</span>
                </div>
              )}
            </div>
          </div>

          {repair.status !== "completed" && repair.status !== "cancelled" && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">快捷操作</h3>
              <div className="space-y-2">
                {repair.status === "pending_check" && (
                  <button
                    onClick={() => handleStatusChange("pending_confirm")}
                    className="btn-secondary w-full"
                  >
                    填写方案并报价
                  </button>
                )}
                {repair.status === "pending_confirm" && (
                  <>
                    {canStartRepair ? (
                      <button
                        onClick={() => handleStatusChange("repairing")}
                        className="btn-primary w-full"
                      >
                        开始维修
                      </button>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        请先完成：{!repair.repairPlan && "填写维修方案 "}
                        {!repair.quotedPrice && "填写报价 "}
                        {!repair.customerConfirmed && "勾选客户确认"}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setEditMode(true);
                      }}
                      className="btn-secondary w-full"
                    >
                      编辑方案和报价
                    </button>
                  </>
                )}
                {repair.status === "repairing" && (
                  <button
                    onClick={() => handleStatusChange("ready")}
                    className="btn-warning w-full"
                  >
                    维修完成，通知取件
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("确定取消该维修单？")) {
                      handleStatusChange("cancelled");
                    }
                  }}
                  className="btn-danger w-full"
                >
                  取消维修单
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">登记收款</h3>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">应收总额</span>
                  <span className="font-semibold text-amber-900">{formatCurrency(repair.totalAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-amber-700">已收款</span>
                  <span className="font-semibold text-green-700">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-amber-200">
                  <span className="text-amber-700 font-medium">剩余应收</span>
                  <span className="font-bold text-red-600">{formatCurrency(unpaidAmount || repair.totalAmount || 0)}</span>
                </div>
              </div>
              <div>
                <label className="label">收款金额 (¥)</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  max={unpaidAmount || repair.totalAmount || 0}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="input text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  最多可收 <span className="font-medium text-red-600">{formatCurrency(unpaidAmount || repair.totalAmount || 0)}</span>
                </p>
              </div>
              <div>
                <label className="label">收款方式</label>
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
                  placeholder="如：补收尾款、部分收款等"
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPayModal(false)} className="btn-secondary flex-1">
                  取消
                </button>
                <button onClick={handleSubmitPayment} className="btn-primary flex-1">
                  <DollarSign className="w-4 h-4" />
                  确认收款
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
