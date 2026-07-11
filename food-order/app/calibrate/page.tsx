'use client'

import { useState, useEffect, useRef } from 'react'

interface ScaleData {
  weight: number
  stable: boolean
  updatedAt: number
  stale: boolean
  cal: number
}

interface Ingredient {
  id: string
  label: string
  rate_g_per_sec: number | null
}

const DEFAULT_DURATION_SEC = 1.5

export default function CalibratePage() {
  const [data, setData] = useState<ScaleData | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [selected, setSelected] = useState<string>('rau')
  const [continuousOn, setContinuousOn] = useState(false)
  const [busy1s, setBusy1s] = useState(false)
  const [toast, setToast] = useState('')
  const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const adjustDuration = (delta: number) =>
    setDurationSec(prev => Math.max(0.1, Math.round((prev + delta) * 100) / 100))

  useEffect(() => {
    const tick = () =>
      fetch('/api/scale', { cache: 'no-store' })
        .then(r => r.json())
        .then(setData)
        .catch(() => {})
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [])

  const loadIngredients = () =>
    fetch('/api/robot/ingredients', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.ingredients) setIngredients(d.ingredients) })
      .catch(() => {})

  useEffect(() => { loadIngredients() }, [])

  const showToast = (msg: string, ms = 3000) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), ms)
  }

  const tare = async () => {
    try {
      await fetch('/api/scale/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tare' }),
      })
      showToast('Đã gửi lệnh TARE — ESP áp dụng trong vài giây')
    } catch {
      showToast('Không gửi được lệnh TARE')
    }
  }

  const runOneSecond = async () => {
    setBusy1s(true)
    showToast(`Đang bơm ${durationSec}s...`, 60000)
    try {
      await fetch('/api/robot/calibrate_pump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_sec: durationSec, ingredient: selected }),
      })
      setTimeout(() => {
        setBusy1s(false)
        showToast('Xong! Kiểm tra số cân rồi bấm "Lưu tốc độ" bên dưới')
      }, durationSec * 1000 + 400)
    } catch {
      setBusy1s(false)
      showToast('Lỗi khi gọi robot server (ROBOT_SERVER_URL/ngrok còn sống không?)')
    }
  }

  const toggleContinuous = async () => {
    const path = continuousOn ? '/api/robot/pump_continuous_stop' : '/api/robot/pump_continuous_start'
    try {
      const r = await fetch(path, { method: 'POST' })
      const d = await r.json()
      if (d.error) {
        showToast(d.error)
        return
      }
      setContinuousOn(!continuousOn)
      if (!continuousOn) showToast('Đang chạy liên tục — tự dừng sau 30s nếu quên bấm Dừng', 30000)
    } catch {
      showToast('Không gọi được robot server')
    }
  }

  const saveRate = async () => {
    if (!data || data.weight <= 0) {
      showToast('Chưa có số cân hợp lệ để lưu')
      return
    }
    try {
      const r = await fetch(`/api/robot/ingredients/${selected}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measured_weight_g: data.weight, duration_sec: durationSec }),
      })
      const d = await r.json()
      if (d.error) { showToast(d.error); return }
      showToast(`Đã lưu ${INGREDIENT_LABEL(ingredients, selected)}: ${d.rate_g_per_sec} g/s`)
      loadIngredients()
    } catch {
      showToast('Không lưu được — kiểm tra robot server')
    }
  }

  const weight = data?.weight ?? 0
  const stale = data?.stale ?? true
  const current = ingredients.find(i => i.id === selected)

  return (
    <div className="min-h-screen bg-[#0a1120] text-white flex flex-col items-center py-8 px-4 gap-5">
      <p className="text-xs uppercase tracking-[4px] text-gray-500">Hiệu chỉnh định lượng — Cơm Rang 247</p>

      {/* Ingredient selector */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
        {(ingredients.length ? ingredients : DEFAULT_INGREDIENTS).map(ing => (
          <button
            key={ing.id}
            type="button"
            onClick={() => setSelected(ing.id)}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
              selected === ing.id
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-600/30'
                : 'bg-[#111e2e] text-gray-400 border border-gray-800'
            }`}
          >
            {ing.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        Tốc độ đã lưu: {current?.rate_g_per_sec != null
          ? <span className="text-cyan-400 font-bold">{current.rate_g_per_sec} g/s</span>
          : <span className="text-gray-600">chưa hiệu chỉnh</span>}
      </p>

      <p className={`text-8xl font-black tabular-nums leading-none transition-colors duration-300 ${
        stale ? 'text-gray-700' : weight > 1 ? 'text-emerald-400' : 'text-gray-300'
      }`}>
        {weight.toFixed(1)}
        <span className="text-2xl text-gray-500 ml-2">g</span>
      </p>

      <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${
        stale ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/40 text-emerald-400'
      }`}>
        {stale ? 'MẤT KẾT NỐI ESP' : `Cal Factor cân: ${(data?.cal ?? 0).toFixed(2)}`}
      </div>

      {toast && (
        <div className="text-xs text-center px-4 py-2 rounded-xl bg-[#111e2e] border border-gray-800 text-gray-300 max-w-xs">
          {toast}
        </div>
      )}

      <div className="w-full max-w-xs bg-[#0d1b2a] border border-gray-800 rounded-3xl p-5 space-y-3">
        <button type="button" onClick={tare}
          className="w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all">
          ↺ TARE — Về 0
        </button>

        <button type="button" onClick={toggleContinuous}
          className={`w-full py-4 rounded-2xl font-bold active:scale-95 transition-all ${
            continuousOn ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-600 hover:bg-orange-500'
          }`}>
          {continuousOn ? '■ DỪNG (đang chạy liên tục)' : '▶ Chạy liên tục — mồi phôi'}
        </button>

        {/* Custom duration */}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Thời gian bơm (giây)</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => adjustDuration(-0.1)}
              className="w-9 h-9 shrink-0 rounded-xl bg-[#111e2e] border border-gray-800 text-gray-300 font-bold active:scale-95 transition-all">−</button>
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={durationSec}
              onChange={e => setDurationSec(Math.max(0.1, Number(e.target.value) || 0.1))}
              className="flex-1 text-center px-3 py-2 bg-[#111e2e] border border-gray-800 rounded-xl text-sm font-bold focus:outline-none focus:border-cyan-700"
            />
            <button type="button" onClick={() => adjustDuration(0.1)}
              className="w-9 h-9 shrink-0 rounded-xl bg-[#111e2e] border border-gray-800 text-gray-300 font-bold active:scale-95 transition-all">+</button>
          </div>
        </div>

        <button type="button" disabled={busy1s || continuousOn} onClick={runOneSecond}
          className="w-full py-4 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {busy1s ? 'Đang bơm...' : `⏱ Bơm ${current?.label ?? ''} đúng ${durationSec}s`}
        </button>

        <button type="button" onClick={saveRate}
          className="w-full py-3 rounded-2xl font-bold bg-cyan-700 hover:bg-cyan-600 active:scale-95 transition-all">
          💾 Lưu tốc độ này cho {current?.label ?? '...'}
        </button>

        <div className="text-[11px] text-gray-500 leading-relaxed pt-1 border-t border-gray-800 space-y-1">
          <p>Cả 4 nguyên liệu dùng chung 1 cơ cấu bơm — đổ từng loại vào phễu rồi hiệu chỉnh riêng.</p>
          <p>1. Chọn nguyên liệu ở trên → đổ nguyên liệu đó vào phễu</p>
          <p>2. Để cốc trống lên cân → <b>TARE</b></p>
          <p>3. Bấm <b>Chạy liên tục</b> để mồi phôi cho đều dòng, bấm lại để dừng khi thấy đều</p>
          <p>4. Đổ hết phần vừa mồi đi, <b>TARE</b> lại lần nữa (cân về 0)</p>
          <p>5. Chỉnh <b>thời gian bơm</b> ở trên (vd giảm dần nếu cần ít gram hơn) → bấm <b>Bơm</b> → đợi số cân ổn định</p>
          <p>6. Chưa đúng số gram mong muốn thì chỉnh lại thời gian rồi bơm lại — số cân sẽ tự cộng dồn nên nhớ TARE lại trước mỗi lần thử</p>
          <p>7. Đạt đúng số gram cần → bấm <b>Lưu tốc độ</b> — hệ thống tự tính g/s theo thời gian bơm vừa dùng và số cân hiện tại, lưu cho nguyên liệu đang chọn (không cần sửa code/restart)</p>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_INGREDIENTS: Ingredient[] = [
  { id: 'rau', label: 'Rau', rate_g_per_sec: null },
  { id: 'ngo', label: 'Ngô', rate_g_per_sec: null },
  { id: 'com', label: 'Cơm', rate_g_per_sec: null },
  { id: 'carot', label: 'Cà rốt', rate_g_per_sec: null },
]

function INGREDIENT_LABEL(list: Ingredient[], id: string) {
  return list.find(i => i.id === id)?.label ?? id
}
