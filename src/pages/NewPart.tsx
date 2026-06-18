import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { partsApi } from "@/lib/api";

const categories = ["内存", "屏幕", "电池", "存储", "电源", "主板", "键盘", "风扇", "其他"];

export default function NewPart() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    model: "",
    category: "其他",
    stock: 0,
    safetyStock: 5,
    unitPrice: 0,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.model) {
      alert("请填写零件名称和型号");
      return;
    }
    setLoading(true);
    try {
      await partsApi.create(form);
      navigate("/inventory");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/inventory" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新增零件</h1>
          <p className="text-sm text-gray-500 mt-1">添加新零件到库存</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                零件名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="如：DDR4 内存条"
                required
              />
            </div>
            <div>
              <label className="label">
                型号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="input"
                placeholder="如：8GB 3200MHz"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">分类</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">单价 (¥)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">初始库存</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="label">安全库存</label>
              <input
                type="number"
                min={0}
                value={form.safetyStock}
                onChange={(e) => setForm({ ...form, safetyStock: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link to="/inventory" className="btn-secondary">
              取消
            </Link>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" />
              {loading ? "保存中..." : "保存零件"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
