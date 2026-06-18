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
import { BarChart3, AlertCircle, TrendingUp } from "lucide-react";
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

export default function Statistics() {
  const [monthly, setMonthly] = useState<{ month: string; count: number }[]>([]);
  const [faults, setFaults] = useState<{ name: string; value: number }[]>([]);
  const [parts, setParts] = useState<
    { name: string; model: string; totalUsed: number; totalAmount: number }[]
  >([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [m, f, p] = await Promise.all([
        statisticsApi.monthly(),
        statisticsApi.faults(),
        statisticsApi.parts(),
      ]);
      setMonthly(m);
      setFaults(f);
      setParts(p);
    } catch (e) {
      console.error(e);
    }
  }

  const totalRepairs = monthly.reduce((sum, m) => sum + m.count, 0);
  const totalRevenue = parts.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">统计报表</h1>
          <p className="text-sm text-gray-500 mt-1">查看经营数据和业务统计</p>
        </div>
      </div>

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
