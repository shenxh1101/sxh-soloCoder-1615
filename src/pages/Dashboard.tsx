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
} from "lucide-react";
import type { RepairOrder } from "~shared/types";
import { STATUS_LABELS, STATUS_COLORS } from "~shared/types";
import { repairsApi, partsApi } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/utils";

export default function Dashboard() {
  const [overdueRepairs, setOverdueRepairs] = useState<RepairOrder[]>([]);
  const [todayStats, setTodayStats] = useState({
    pendingCheck: 0,
    repairing: 0,
    ready: 0,
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentRepairs, setRecentRepairs] = useState<RepairOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [overdue, allRepairs, lowStock] = await Promise.all([
        repairsApi.getOverdue(),
        repairsApi.list(),
        partsApi.getLowStock(),
      ]);
      setOverdueRepairs(overdue);
      setTodayStats({
        pendingCheck: allRepairs.filter((r) => r.status === "pending_check").length,
        repairing: allRepairs.filter((r) => r.status === "repairing").length,
        ready: allRepairs.filter((r) => r.status === "ready").length,
      });
      setLowStockCount(lowStock.length);
      setRecentRepairs(allRepairs.slice(0, 5));
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
