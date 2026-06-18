import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import type { DeviceType } from "~shared/types";
import { FAULT_TYPES } from "~shared/types";
import { repairsApi } from "@/lib/api";

const deviceTypes: DeviceType[] = ["电脑", "笔记本", "手机", "其他"];

export default function NewRepair() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerPhone: "",
    customerName: "",
    deviceType: "笔记本" as DeviceType,
    deviceModel: "",
    faultType: "",
    faultDescription: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerPhone || !form.deviceModel || !form.faultDescription) {
      alert("请填写必填项");
      return;
    }
    setLoading(true);
    try {
      const repair = await repairsApi.create(form);
      navigate(`/repairs/${repair.id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/repairs" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建维修单</h1>
          <p className="text-sm text-gray-500 mt-1">登记客户送修设备信息</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 max-w-3xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">客户信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">联系电话 <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="input"
                  placeholder="请输入客户手机号"
                  required
                />
              </div>
              <div>
                <label className="label">客户姓名</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="input"
                  placeholder="选填"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">设备信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">设备类型 <span className="text-red-500">*</span></label>
                <select
                  value={form.deviceType}
                  onChange={(e) => setForm({ ...form, deviceType: e.target.value as DeviceType })}
                  className="input"
                >
                  {deviceTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">设备型号 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.deviceModel}
                  onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
                  className="input"
                  placeholder="如：ThinkPad T480、iPhone 13"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">故障信息</h2>
            <div className="space-y-4">
              <div>
                <label className="label">故障类型</label>
                <select
                  value={form.faultType}
                  onChange={(e) => setForm({ ...form, faultType: e.target.value })}
                  className="input"
                >
                  <option value="">请选择故障类型</option>
                  {FAULT_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">故障描述 <span className="text-red-500">*</span></label>
                <textarea
                  value={form.faultDescription}
                  onChange={(e) => setForm({ ...form, faultDescription: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="详细描述故障现象，如：开机无显示，电源指示灯不亮..."
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link to="/repairs" className="btn-secondary">
              取消
            </Link>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" />
              {loading ? "保存中..." : "创建维修单"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
