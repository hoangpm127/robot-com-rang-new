'use client'

import { useState, useEffect, useRef } from 'react'

interface ScaleData {
  weight: number
  stable: boolean
  updatedAt: number
  stale: boolean
  cal: number
}

export default function CalibratePage() {
  const [data, setData] = useState<ScaleData | null>(null)
  const [continuousOn, setContinuousOn] = useState(false)
  const [busy1s, setBusy1s] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    showToast('Đang bơm 1 giây...', 60000)
    try {
      await fetch('/api/robot/calibrate_pump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_sec: 1.0 }),
      })
      setTimeout(() => {
        setBusy1s(false)
        showToast('Xong! Xem số cân bên dưới = tốc độ gram/giây')
      }, 1400)
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

  const weight = data?.weight ?? 0
  const stale = data?.stale ?? true
  const cal = data?.cal ?? 0

  return (
    <div className="min-h-screen bg-[#0a1120] text-white flex flex-col items-center py-8 px-4 gap-5">
      <p className="text-xs uppercase tracking-[4px] text-gray-500">Hiệu chỉnh định lượng — Cơm Rang 247</p>

      <p className={`text-8xl font-black tabular-nums leading-none transition-colors duration-300 ${
        stale ? 'text-gray-700' : weight > 1 ? 'text-emerald-400' : 'text-gray-300'
      }`}>
        {weight.toFixed(1)}
        <span className="text-2xl text-gray-500 ml-2">g</span>
      </p>

      <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${
        stale ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/40 text-emerald-400'
      }`}>
        {stale ? 'MẤT KẾT NỐI ESP' : `Cal Factor: ${cal.toFixed(2)}`}
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

        <button type="button" disabled={busy1s || continuousOn} onClick={runOneSecond}
          className="w-full py-4 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {busy1s ? 'Đang bơm...' : '⏱ Bơm đúng 1 giây'}
        </button>

        <div className="text-[11px] text-gray-500 leading-relaxed pt-1 border-t border-gray-800 space-y-1">
          <p>1. Để cốc trống lên cân → <b>TARE</b></p>
          <p>2. Bấm <b>Chạy liên tục</b> để mồi phôi cho đều dòng, bấm lại để dừng khi thấy đều</p>
          <p>3. Đổ hết phần vừa mồi đi, <b>TARE</b> lại lần nữa (cân về 0)</p>
          <p>4. Bấm <b>Bơm đúng 1 giây</b> → đọc số cân hiện lên = tốc độ gram/giây</p>
          <p>5. Điền số đó vào <code className="text-gray-400">PUMP_RATE_G_PER_SEC</code> đầu file <code className="text-gray-400">server.py</code>, khởi động lại</p>
        </div>
      </div>
    </div>
  )
}
