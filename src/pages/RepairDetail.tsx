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
} from "lucide-react";
import type { RepairOrder, RepairStatus, Part } from "~shared/types";
import { STATUS_LABELS, STATUS_COLORS, FAULT_TYPES } from "~shared/types";
import { repairsApi, partsApi } from "@/lib/api";
import { formatDate, formatCurrency, isOverdue } from "@/lib/utils";

const statusFlow: { status: RepairStatus; label: string; icon: any }[] = [
  { status: "pending_check", label: "待检查", icon: Clock },
  { status: "pending_confirm", label: "待确认", icon: AlertTriangle },
  { status: "repairing", label: "维修中", icon: Wrench },
  { status: "ready", label: "待取件", icon: PackageCheck },
  { status: "completed", label: "已完成", icon: CheckCircle },
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
      });
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
    if (!id || !selectedPartId) return;
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
      const updated = await repairsApi.update(Number(id), editForm);
      setRepair(updated);
      setEditMode(false);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleComplete() {
    if (!id) return;
    const total = partsTotal + laborFeeInput;
    if (!confirm(`确认完成结算？总金额：${formatCurrency(total)}`)) return;
    try {
      const updated = await repairsApi.complete(Number(id), laborFeeInput);
      setRepair(updated);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const availableParts = allParts.filter(
    (p) => p.stock > 0 && !repair.partsUsed.find((ru) => ru.partId === p.id)
  );

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
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (!isCancelled && repair.status !== "completed" && index <= currentStepIndex + 1) {
                        handleStatusChange(step.status);
                      }
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-primary-600 text-white ring-4 ring-primary-100"
                        : "bg-gray-100 text-gray-400"
                    } ${
                      !isCancelled &&
                      repair.status !== "completed" &&
                      index <= currentStepIndex + 1 &&
                      index !== currentStepIndex
                        ? "cursor-pointer hover:scale-105"
                        : ""
                    }`}
                    disabled={
                      isCancelled ||
                      repair.status === "completed" ||
                      index > currentStepIndex + 1
                    }
                  >
                    <step.icon className="w-5 h-5" />
                  </button>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCurrent ? "text-primary-700" : isDone ? "text-gray-700" : "text-gray-400"
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
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">使用零件</h3>
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
                      {repair.status !== "completed" && (
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
                        {repair.status !== "completed" && (
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
                暂无使用零件
              </div>
            )}

            {repair.status !== "completed" && repair.status !== "cancelled" && (
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
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">费用结算</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">零件费</span>
                <span className="text-gray-900 font-medium">{formatCurrency(partsTotal)}</span>
              </div>
              {repair.status !== "completed" ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">工时费</span>
                  <input
                    type="number"
                    min={0}
                    value={laborFeeInput}
                    onChange={(e) => setLaborFeeInput(Number(e.target.value))}
                    className="w-28 input py-1 text-right"
                  />
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
                <span className="text-gray-700 font-medium">总金额</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(partsTotal + laborFeeInput)}
                </span>
              </div>
              {repair.paid ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">已收款</span>
                </div>
              ) : repair.status === "ready" || repair.status === "repairing" ? (
                <button onClick={handleComplete} className="btn-primary w-full">
                  <CheckCircle className="w-4 h-4" />
                  完成结算收款
                </button>
              ) : null}
            </div>
          </div>

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
                {repair.status === "pending_confirm" && repair.customerConfirmed && (
                  <button
                    onClick={() => handleStatusChange("repairing")}
                    className="btn-primary w-full"
                  >
                    开始维修
                  </button>
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
    </div>
  );
}
