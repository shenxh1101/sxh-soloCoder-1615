import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, AlertCircle, TrendingUp, Download, Calendar } from "lucide-react";
import { statisticsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#0d9488",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f97316",
  "#6366f1",
];

function getMonthOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return options;
}

export default function Statistics() {
  const [monthly, setMonthly] = useState<{ month: string; count: number }[]>([]);
  const [faults, setFaults] = useState<{ name: string; value: number }[]>([]);
  const [parts, setParts] = useState<
    { name: string; model: string; totalUsed: number; totalAmount: number }[]
  >([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [summary, setSummary] = useState<{
    month: string;
    repairCount: number;
    completedCount: number;
    totalRevenue: number;
    partsRevenue: number;
    laborRevenue: number;
  } | null>(null);
  const [monthOptions] = useState(getMonthOptions);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  async function loadData() {
    try {
      const [m, f, p, s] = await Promise.all([
        statisticsApi.monthly(),
        statisticsApi.faults(selectedMonth || undefined),
        statisticsApi.parts(selectedMonth || undefined),
        statisticsApi.summary(selectedMonth || undefined),
      ]);
      setMonthly(m);
      setFaults(f);
      setParts(p);
      setSummary(s);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleExport() {
    try {
      const data = await statisticsApi.exportReport(selectedMonth || undefined);
      const lines: string[] = [];
      const m = data.month;
      lines.push(`=== 维修店月度报表 ${m} ===`);
      lines.push(`导出时间：${new Date(data.exportedAt).toLocaleString("zh-CN")}`);
      lines.push("");
      lines.push(`--- 概览 ---`);
      lines.push(`维修台数：${data.summary?.repairCount || 0}`);
      lines.push(`已完成数：${data.summary?.completedCount || 0}`);
      lines.push(`总收入：¥${(data.summary?.totalRevenue || 0).toFixed(2)}`);
      lines.push("");
      lines.push(`--- 故障分布 ---`);
      (data.faults || []).forEach((f: any) => {
        lines.push(`${f.name}：${f.value}台`);
      });
      lines.push("");
      lines.push(`--- 零件消耗 ---`);
      (data.partsConsumption || []).forEach((p: any) => {
        lines.push(`${p.name}(${p.model})：使用${p.totalUsed}件，金额¥${(p.totalAmount || 0).toFixed(2)}`);
      });
      lines.push("");
      lines.push(`--- 维修明细 ---`);
      (data.repairs || []).forEach((r: any) => {
        lines.push(`#${r.id} ${r.customerName || r.customerPhone} ${r.deviceType} ${r.deviceModel} ${r.faultType || "未分类"} ${STATUS_LABELS[r.status] || r.status} 报价¥${r.quotedPrice || 0} 总额¥${r.totalAmount || 0}`);
      });

      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `维修店报表_${m}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("导出失败");
    }
  }

  const totalRepairs = monthly.reduce((sum, m) => sum + m.count, 0);
  const totalRevenue = parts.reduce((sum, p) => sum + p.totalAmount, 0);

  const STATUS_LABELS: Record<string, string> = {
    pending_check: "待检查",
    pending_confirm: "待确认",
    repairing: "维修中",
    ready: "待取件",
    completed: "已完成",
    cancelled: "已取消",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">统计报表</h1>
          <p className="text-sm text-gray-500 mt-1">查看经营数据和业务统计</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input pl-9 pr-8"
            >
              <option value="">全部月份</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {selectedMonth ? "当月维修" : "维修台数"}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{summary.repairCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{summary.completedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总收入</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              <span>零件：{formatCurrency(summary.partsRevenue)}</span>
              <span>工时：{formatCurrency(summary.laborRevenue)}</span>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">故障类型</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{faults.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">累计维修台数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalRepairs}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">零件销售额</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">故障类型</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{faults.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">月度维修量</h3>
          <div className="h-80">
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [`${value} 台`, "维修量"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#barGradient)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                暂无数据
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">故障类型分布</h3>
          <div className="h-80">
            {faults.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={faults}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {faults.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} 台`, "数量"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                暂无数据
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">零件消耗排行</h3>
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-12">
                  排名
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  零件名称
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  型号
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  使用数量
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  消耗金额
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parts.map((p, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                          ? "bg-gray-200 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.model}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                    {p.totalUsed} 件
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-primary-600">
                    {formatCurrency(p.totalAmount)}
                  </td>
                </tr>
              ))}
              {parts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    暂无零件消耗数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
