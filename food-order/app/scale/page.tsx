'use client'

import { useState, useEffect } from 'react'

interface ScaleData {
  weight: number
  stable: boolean
  updatedAt: number
  stale: boolean
}

export default function ScalePage() {
  const [data, setData] = useState<ScaleData | null>(null)

  useEffect(() => {
    const tick = () =>
      fetch('/api/scale', { cache: 'no-store' })
        .then(r => r.json())
        .then(setData)
        .catch(() => {})
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [])

  const weight = data?.weight ?? 0
  const stable = data?.stable ?? false
  const stale  = data?.stale ?? true

  return (
    <div className="min-h-screen bg-[#0a1120] text-white flex flex-col items-center justify-center gap-6 px-4">
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
        <p className="text-xs text-gray-600">
          Cập nhật lúc {new Date(data.updatedAt).toLocaleTimeString('vi-VN')}
        </p>
      )}
    </div>
  )
}
