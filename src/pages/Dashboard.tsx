import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Wrench,
  PackageCheck,
  Phone,
  Plus,
  PackagePlus,
  Calendar,
  ChevronRight,
  DollarSign,
  Shield,
  MessageCircle,
} from "lucide-react";
import type { RepairOrder } from "~shared/types";
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_METHOD_LABELS } from "~shared/types";
import { repairsApi, partsApi } from "@/lib/api";
import { formatDate, isOverdue, formatCurrency } from "@/lib/utils";

function getPaidAmount(repair: RepairOrder): number {
  if (!repair.payments || repair.payments.length === 0) return 0;
  return repair.payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

export default function Dashboard() {
  const [overdueRepairs, setOverdueRepairs] = useState<RepairOrder[]>([]);
  const [todayStats, setTodayStats] = useState({
    pendingCheck: 0,
    repairing: 0,
    ready: 0,
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentRepairs, setRecentRepairs] = useState<RepairOrder[]>([]);
  const [unpaidRepairs, setUnpaidRepairs] = useState<RepairOrder[]>([]);
  const [warrantyExpiring, setWarrantyExpiring] = useState<RepairOrder[]>([]);
  const [awaitingReturnVisit, setAwaitingReturnVisit] = useState<RepairOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [overdue, allRepairs, lowStock, unpaid, expiring, awaitingVisit] = await Promise.all([
        repairsApi.getOverdue(),
        repairsApi.list(),
        partsApi.getLowStock(),
        repairsApi.getUnpaid(),
        repairsApi.getWarrantyExpiring(),
        repairsApi.getAwaitingReturnVisit(),
      ]);
      setOverdueRepairs(overdue);
      setTodayStats({
        pendingCheck: allRepairs.filter((r) => r.status === "pending_check").length,
        repairing: allRepairs.filter((r) => r.status === "repairing").length,
        ready: allRepairs.filter((r) => r.status === "ready").length,
      });
      setLowStockCount(lowStock.length);
      setRecentRepairs(allRepairs.slice(0, 5));
      setUnpaidRepairs(unpaid);
      setWarrantyExpiring(expiring);
      setAwaitingReturnVisit(awaitingVisit);
    } catch (e) {
      console.error(e);
    }
  }

  const statCards = [
    {
      label: "待检查",
      value: todayStats.pendingCheck,
      icon: Clock,
      color: "from-gray-500 to-gray-600",
      bg: "bg-gray-50",
    },
    {
      label: "维修中",
      value: todayStats.repairing,
      icon: Wrench,
      color: "from-primary-500 to-primary-600",
      bg: "bg-primary-50",
    },
    {
      label: "待取件",
      value: todayStats.ready,
      icon: PackageCheck,
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "库存预警",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "from-red-500 to-red-600",
      bg: "bg-red-50",
    },
  ];

  const totalUnpaid = unpaidRepairs.reduce((sum, r) => sum + Number(r.totalAmount || 0) - getPaidAmount(r), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(new Date(), "full")}，欢迎回来
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/repairs/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            新建维修单
          </Link>
          <Link to="/inventory/new" className="btn-secondary">
            <PackagePlus className="w-4 h-4" />
            零件入库
          </Link>
        </div>
      </div>

      {overdueRepairs.length > 0 && (
        <div className="card p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900">
                有 {overdueRepairs.length} 台设备超过 3 天未取，请尽快联系客户！
              </h2>
              <p className="text-sm text-red-700 mt-1">点击电话图标可直接拨号</p>
              <div className="mt-4 space-y-2">
                {overdueRepairs.map((repair) => (
                  <div
                    key={repair.id}
                    className="flex items-center justify-between bg-white/70 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {repair.customerName || "未登记姓名"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {repair.deviceType} · {repair.deviceModel}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-red-600 font-medium">
                        {repair.readyAt ? `已 ${isOverdue(repair.readyAt)} 天` : ""}
                      </span>
                      <a
                        href={`tel:${repair.customerPhone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {repair.customerPhone}
                      </a>
                      <Link
                        to={`/repairs/${repair.id}`}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        查看详情
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {unpaidRepairs.length > 0 && (
        <div className="card p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-orange-900">
                有 {unpaidRepairs.length} 笔应收款，共计 {formatCurrency(totalUnpaid)}
              </h2>
              <p className="text-sm text-orange-700 mt-1">点击可直接登记收款</p>
              <div className="mt-4 space-y-2">
                {unpaidRepairs.slice(0, 5).map((repair) => {
                  const paid = getPaidAmount(repair);
                  const remain = Number(repair.totalAmount || 0) - paid;
                  return (
                    <div
                      key={repair.id}
                      className="flex items-center justify-between bg-white/70 rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            维修单 #{repair.id} · {repair.customerName || repair.customerPhone}
                          </div>
                          <div className="text-sm text-gray-500">
                            {repair.deviceType} · {repair.deviceModel}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-orange-700">
                            待收 {formatCurrency(remain)}
                          </div>
                          <div className="text-xs text-gray-500">
                            总额 {formatCurrency(repair.totalAmount || 0)}
                            {paid > 0 && ` / 已收 ${formatCurrency(paid)}`}
                          </div>
                        </div>
                        <Link
                          to={`/repairs/${repair.id}`}
                          className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          登记收款
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {unpaidRepairs.length > 5 && (
                  <Link to="/repairs?status=completed" className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-2">
                    查看全部 {unpaidRepairs.length} 笔 <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {warrantyExpiring.length > 0 && (
        <div className="card p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-purple-900">
                有 {warrantyExpiring.length} 单保修即将在 30 天内到期
              </h2>
              <p className="text-sm text-purple-700 mt-1">提醒客户到期前做一次免费检查，提升满意度</p>
              <div className="mt-4 space-y-2">
                {warrantyExpiring.slice(0, 5).map((repair) => (
                  <div
                    key={repair.id}
                    className="flex items-center justify-between bg-white/70 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {repair.customerName || "未登记姓名"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {repair.deviceType} · {repair.deviceModel}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-purple-700">
                          {repair.warrantyExpires ? `到期日：${formatDate(repair.warrantyExpires)}` : ""}
                        </div>
                      </div>
                      <a
                        href={`tel:${repair.customerPhone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        联系客户
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {awaitingReturnVisit.length > 0 && (
        <div className="card p-6 bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-teal-900">
                有 {awaitingReturnVisit.length} 单已完成超过 5 天未回访
              </h2>
              <p className="text-sm text-teal-700 mt-1">及时回访，提升客户口碑和复购率</p>
              <div className="mt-4 space-y-2">
                {awaitingReturnVisit.slice(0, 5).map((repair) => (
                  <div
                    key={repair.id}
                    className="flex items-center justify-between bg-white/70 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {repair.customerName || "未登记姓名"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {repair.deviceType} · {repair.deviceModel}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-teal-700">
                        {repair.completedAt ? `完成于 ${formatDate(repair.completedAt)}` : ""}
                      </div>
                      <Link
                        to={`/repairs/${repair.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        新增回访
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}
              >
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">最近维修单</h3>
            <Link
              to="/repairs"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRepairs.map((repair) => (
              <Link
                key={repair.id}
                to={`/repairs/${repair.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {repair.deviceModel}
                    </div>
                    <div className="text-sm text-gray-500">
                      {repair.customerPhone} · {formatDate(repair.receivedAt)}
                    </div>
                  </div>
                </div>
                <span className={`badge ${STATUS_COLORS[repair.status]}`}>
                  {STATUS_LABELS[repair.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">快捷操作</h3>
          </div>
          <div className="p-4 space-y-2">
            <Link
              to="/repairs/new"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">新建维修单</p>
                <p className="text-xs text-gray-500">客户送修登记</p>
              </div>
            </Link>
            <Link
              to="/inventory/new"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <PackagePlus className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">零件入库</p>
                <p className="text-xs text-gray-500">新增或补充库存</p>
              </div>
            </Link>
            <Link
              to="/suppliers"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">供应商管理</p>
                <p className="text-xs text-gray-500">维护供应商档案</p>
              </div>
            </Link>
            <Link
              to="/statistics"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">本月统计</p>
                <p className="text-xs text-gray-500">查看经营数据</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
