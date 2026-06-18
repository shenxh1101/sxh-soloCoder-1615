import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Phone, Monitor, Smartphone, Laptop, HelpCircle, Filter, DollarSign } from "lucide-react";
import type { RepairOrder, RepairStatus, DeviceType, PaymentMethod } from "~shared/types";
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_METHOD_LABELS } from "~shared/types";
import { repairsApi } from "@/lib/api";
import { formatDate, isOverdue, formatCurrency } from "@/lib/utils";

const DeviceIcon = ({ type }: { type: DeviceType }) => {
  const cls = "w-5 h-5";
  switch (type) {
    case "电脑":
      return <Monitor className={cls} />;
    case "笔记本":
      return <Laptop className={cls} />;
    case "手机":
      return <Smartphone className={cls} />;
    default:
      return <HelpCircle className={cls} />;
  }
};

export default function RepairList() {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "">("");
  const [phoneSearch, setPhoneSearch] = useState("");

  useEffect(() => {
    loadRepairs();
  }, [statusFilter, phoneSearch]);

  async function loadRepairs() {
    try {
      const data = await repairsApi.list({
        status: statusFilter || undefined,
        phone: phoneSearch || undefined,
      });
      setRepairs(data);
    } catch (e) {
      console.error(e);
    }
  }

  const statusOptions: { value: RepairStatus | ""; label: string }[] = [
    { value: "", label: "全部状态" },
    { value: "pending_check", label: "待检查" },
    { value: "pending_confirm", label: "待确认" },
    { value: "repairing", label: "维修中" },
    { value: "ready", label: "待取件" },
    { value: "completed", label: "已完成" },
    { value: "cancelled", label: "已取消" },
  ];

  function getPaidAmount(repair: RepairOrder): number {
    return (repair.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">维修单</h1>
        <Link to="/repairs/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          新建维修单
        </Link>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户电话..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RepairStatus | "")}
              className="input w-40"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                设备信息
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                客户
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                故障
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                收机时间
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                状态
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                金额
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {repairs.map((repair) => {
              const isRepairOverdue =
                repair.status === "ready" && repair.readyAt && isOverdue(repair.readyAt) > 3;
              const paidAmount = getPaidAmount(repair);
              const isUnpaid = repair.status === "completed" && !repair.paid;
              const isPartial =
                repair.status === "completed" &&
                repair.totalAmount &&
                paidAmount > 0 &&
                paidAmount < repair.totalAmount;
              return (
                <tr
                  key={repair.id}
                  className={isRepairOverdue ? "bg-red-50/50" : "hover:bg-gray-50"}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        <DeviceIcon type={repair.deviceType} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{repair.deviceModel}</div>
                        <div className="text-xs text-gray-500">{repair.deviceType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">
                        {repair.customerName || "未登记姓名"}
                      </span>
                      <a
                        href={`tel:${repair.customerPhone}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-sm text-gray-500">{repair.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 line-clamp-1 max-w-xs">
                      {repair.faultDescription}
                    </div>
                    {repair.faultType && (
                      <div className="text-xs text-gray-500 mt-0.5">{repair.faultType}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{formatDate(repair.receivedAt)}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(repair.receivedAt, "long").split(" ")[1]}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`badge w-fit ${STATUS_COLORS[repair.status]}`}>
                        {STATUS_LABELS[repair.status]}
                      </span>
                      {isRepairOverdue && (
                        <span className="text-xs text-red-600 font-medium">
                          超期 {isOverdue(repair.readyAt!)} 天
                        </span>
                      )}
                      {isUnpaid && (
                        <span className="badge bg-red-100 text-red-700 w-fit">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          应收 {formatCurrency(repair.totalAmount || 0)}
                        </span>
                      )}
                      {isPartial && (
                        <span className="badge bg-amber-100 text-amber-700 w-fit">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          欠 {formatCurrency((repair.totalAmount || 0) - paidAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {repair.totalAmount ? (
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(repair.totalAmount)}
                      </div>
                    ) : repair.quotedPrice ? (
                      <div className="text-gray-500">报价 {formatCurrency(repair.quotedPrice)}</div>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                    {repair.paid ? (
                      <span className="text-xs text-green-600 font-medium">
                        已收款{repair.paymentMethod && repair.paymentMethod !== "unpaid"
                          ? `（${PAYMENT_METHOD_LABELS[repair.paymentMethod as PaymentMethod]}）`
                          : ""}
                      </span>
                    ) : repair.status === "completed" ? (
                      <span className="text-xs text-red-600 font-medium">待收款</span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/repairs/${repair.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              );
            })}
            {repairs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                  暂无维修单数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
