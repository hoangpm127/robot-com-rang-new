'use client'

import { useState, useEffect, useRef } from 'react'

interface ScaleData {
  weight: number
  stable: boolean
  updatedAt: number
  stale: boolean
  cal: number
  lastAppliedId: number
}

export default function ScalePage() {
  const [data, setData] = useState<ScaleData | null>(null)
  const [knownWeight, setKnownWeight] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [toast, setToast] = useState('')
  const pendingSinceRef = useRef(0)

  useEffect(() => {
    const tick = () =>
      fetch('/api/scale', { cache: 'no-store' })
        .then(r => r.json())
        .then(setData)
        .catch(() => {})
    tick()
    const id = setInterval(tick, 150)
    return () => clearInterval(id)
  }, [])

  // Theo dõi khi ESP đã áp dụng xong lệnh đang chờ
  useEffect(() => {
    if (pendingId == null || !data) return
    if (data.lastAppliedId >= pendingId) {
      setToast(`${pendingLabel} — xong! Cal = ${data.cal.toFixed(2)}`)
      setPendingId(null)
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
    // ESP poll moi 1.5s, cho toi da 10s truoc khi bao "khong thay phan hoi"
    if (Date.now() - pendingSinceRef.current > 10000) {
      setToast('ESP chưa phản hồi — kiểm tra ESP còn online không')
      setPendingId(null)
    }
  }, [data, pendingId, pendingLabel])

  const sendCommand = async (body: object, label: string) => {
    setPendingLabel(label)
    pendingSinceRef.current = Date.now()
    try {
      const r = await fetch('/api/scale/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (d.id) setPendingId(d.id)
      else setToast('Gửi lệnh thất bại')
    } catch {
      setToast('Không gửi được lệnh')
    }
  }

  const weight = data?.weight ?? 0
  const stable = data?.stable ?? false
  const stale  = data?.stale ?? true
  const cal    = data?.cal ?? 0

  return (
    <div className="min-h-screen bg-[#0a1120] text-white flex flex-col items-center py-8 px-4 gap-6">
      <p className="text-xs uppercase tracking-[4px] text-gray-500">Cân LoadCell — Cơm Rang 247</p>

      <p className={`text-9xl font-black tabular-nums leading-none transition-colors duration-300 ${
        stale ? 'text-gray-700' : weight > 1 ? 'text-emerald-400' : 'text-gray-300'
      }`}>
        {Math.round(weight)}
        <span className="text-3xl text-gray-500 ml-3">g</span>
      </p>

      <div className={`px-5 py-2 rounded-full text-sm font-bold tracking-wide ${
        stale
          ? 'bg-red-900/40 text-red-400 border border-red-800/50'
          : stable
          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
          : 'bg-blue-900/40 text-blue-400 border border-blue-800/50'
      }`}>
        {stale ? 'MẤT KẾT NỐI — ESP chưa gửi dữ liệu' : stable ? 'ỔN ĐỊNH' : 'ĐANG ĐO...'}
      </div>

      {data && !stale && (
        <p className="text-xs text-gray-600 -mt-3">
          Cập nhật lúc {new Date(data.updatedAt).toLocaleTimeString('vi-VN')}
        </p>
      )}

      {/* Toast thông báo */}
      {toast && (
        <div className="text-xs text-center px-4 py-2 rounded-xl bg-[#111e2e] border border-gray-800 text-gray-300">
          {toast}
        </div>
      )}

      {/* Hiệu chỉnh */}
      <div className="w-full max-w-xs bg-[#0d1b2a] border border-gray-800 rounded-3xl p-5 space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 uppercase tracking-widest">Hiệu chỉnh</span>
          <span className="text-cyan-400 font-bold">Cal Factor: {cal.toFixed(2)}</span>
        </div>

        <button
          type="button"
          disabled={pendingId != null}
          onClick={() => sendCommand({ action: 'tare' }, 'TARE')}
          className="w-full py-3.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {pendingId != null && pendingLabel === 'TARE' ? 'Đang xử lý...' : '↺ TARE — Về 0'}
        </button>

        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Chỉnh thủ công</p>
          <div className="grid grid-cols-4 gap-2">
            {[-100, -10, 10, 100].map(d => (
              <button
                key={d}
                type="button"
                disabled={pendingId != null}
                onClick={() => sendCommand({ action: 'cal_adjust', delta: d }, `${d > 0 ? '+' : ''}${d}`)}
                className="py-2.5 rounded-xl text-sm font-semibold bg-[#111e2e] border border-gray-800 hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Hiệu chỉnh theo khối lượng thực tế</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={knownWeight}
              onChange={e => setKnownWeight(e.target.value)}
              placeholder="KL thực (g)"
              className="flex-1 px-3 py-2.5 bg-[#111e2e] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-cyan-700"
            />
            <button
              type="button"
              disabled={pendingId != null || !knownWeight || Number(knownWeight) <= 0}
              onClick={() => sendCommand({ action: 'calibrate', knownWeight: Number(knownWeight) }, 'Calibrate')}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Set
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
            1. Để cân trống → TARE &nbsp;|&nbsp; 2. Đặt vật đã biết khối lượng lên → đợi ổn định → nhập KL → Set
          </p>
        </div>
      </div>
    </div>
  )
}
