'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const TARGETS = [100, 200, 300] as const
type TargetWeight = typeof TARGETS[number]

type DispenseStatus = 'idle' | 'pumping' | 'settling' | 'measuring' | 'done' | 'error'

interface DispenseState {
  running: boolean
  status: DispenseStatus
  target: number
  weight: number
  attempts: number
  log: string[]
  result: 'ok' | 'underweight' | 'esp_error' | string | null
  sim?: boolean
}

const STATUS_INFO: Record<DispenseStatus, { label: string; color: string; pulse?: boolean }> = {
  idle:      { label: 'Chờ lệnh',            color: 'text-gray-500' },
  pumping:   { label: '🔄 Đang bơm...',      color: 'text-blue-400',   pulse: true },
  settling:  { label: '⏳ Chờ ổn định...',   color: 'text-yellow-400', pulse: true },
  measuring: { label: '⚖️ Đang đo...',       color: 'text-cyan-400',   pulse: true },
  done:      { label: '',                     color: '' },
  error:     { label: '❌ Lỗi!',             color: 'text-red-400' },
}

export default function KitchenPage() {
  const [target, setTarget]     = useState<TargetWeight>(100)
  const [liveW,  setLiveW]      = useState<number>(0)
  const [ds,     setDs]         = useState<DispenseState | null>(null)
  const [polling, setPolling]   = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Always-on weight display (~1.5 Hz from server cache)
  useEffect(() => {
    const tick = () =>
      fetch('/api/robot/weight')
        .then(r => r.json())
        .then(d => { if (typeof d.weight === 'number') setLiveW(d.weight) })
        .catch(() => {})
    tick()
    const id = setInterval(tick, 700)
    return () => clearInterval(id)
  }, [])

  // Status polling while dispensing
  useEffect(() => {
    if (!polling) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/robot/status')
        const data: DispenseState = await r.json()
        setDs(data)
        if (data.weight > 0) setLiveW(data.weight)
        if (!data.running) setPolling(false)
      } catch {}
    }, 400)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [polling])

  const startDispense = async () => {
    if (polling) return
    setServerErr(null)
    setDs(null)
    try {
      const r = await fetch('/api/robot/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const data = await r.json()
      if (!r.ok || data.error) { setServerErr(data.error ?? 'Server error'); return }
      setPolling(true)
    } catch {
      setServerErr('Không kết nối được robot server')
    }
  }

  const reset = () => { setDs(null); setPolling(false) }

  const isRunning = polling || (ds?.running ?? false)
  const dispW     = (isRunning && (ds?.weight ?? 0) > 0) ? ds!.weight : liveW
  const dispTarget = ds?.target ?? target
  const progress  = dispTarget > 0 ? Math.min(100, (dispW / dispTarget) * 100) : 0
  const status    = ds?.status ?? 'idle'
  const isDone    = status === 'done'
  const isOk      = isDone && ds?.result === 'ok'
  const isUnder   = isDone && ds?.result === 'underweight'
  const isSim     = ds?.sim ?? false
  const info      = STATUS_INFO[status]

  return (
    <div className="min-h-screen bg-[#050b14] text-white flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-xs">

        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-lg font-bold text-cyan-400 tracking-wide">KITCHEN DISPENSER</h1>
          {isSim && (
            <span className="inline-block mt-1 text-[10px] bg-yellow-900/50 text-yellow-400 border border-yellow-700/50 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Simulation Mode
            </span>
          )}
        </div>

        {/* Weight card */}
        <div className="bg-[#0d1b2a] border border-cyan-900/40 rounded-3xl p-6 mb-4">
          <div className="text-[10px] uppercase tracking-[3px] text-gray-600 text-center mb-3">
            Khối lượng
          </div>

          {/* Big number */}
          <div className="text-center">
            <span className={`text-8xl font-black tabular-nums transition-colors duration-300 ${
              dispW > 0 ? 'text-cyan-300' : 'text-gray-700'
            }`}>
              {Math.round(dispW)}
            </span>
            <span className="text-2xl text-gray-500 font-semibold ml-2">g</span>
          </div>

          {/* Progress bar */}
          {dispTarget > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-[10px] text-gray-600 mb-1.5">
                <span>0g</span>
                <span className="text-cyan-700">{Math.round(dispW)}g / {dispTarget}g</span>
                <span>{dispTarget}g</span>
              </div>
              <div className="w-full h-2.5 bg-gray-800/80 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isOk ? 'bg-emerald-500' : isUnder ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                />
              </div>
            </div>
          )}

          {/* Result badge */}
          {isDone && (
            <div className={`mt-4 text-center text-sm font-bold py-2.5 px-4 rounded-2xl ${
              isOk
                ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/40'
                : 'bg-amber-900/50 text-amber-400 border border-amber-700/40'
            }`}>
              {isOk
                ? `✅ Đạt chuẩn — ${Math.round(ds!.weight)}g`
                : `⚠️ Thiếu cân — ${Math.round(ds!.weight)}g / ${dispTarget}g`}
            </div>
          )}
        </div>

        {/* Target selector */}
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[3px] text-gray-600 mb-2">Mục tiêu</div>
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map(t => (
              <button
                key={t}
                type="button"
                disabled={isRunning}
                onClick={() => setTarget(t)}
                className={`py-3.5 rounded-2xl text-base font-bold transition-all ${
                  target === t && !isRunning
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-600/30'
                    : 'bg-[#111e2e] text-gray-400 border border-gray-800 hover:border-cyan-900 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                {t}g
              </button>
            ))}
          </div>
        </div>

        {/* Dispense button */}
        {!isDone ? (
          <button
            type="button"
            disabled={isRunning}
            onClick={startDispense}
            className={`w-full py-5 rounded-2xl text-base font-extrabold tracking-wide transition-all mb-3 ${
              isRunning
                ? 'bg-[#111e2e] text-gray-600 cursor-not-allowed border border-gray-800'
                : 'bg-cyan-500 hover:bg-cyan-400 active:scale-[0.97] text-black shadow-xl shadow-cyan-600/25'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-600 border-t-cyan-500 rounded-full animate-spin" />
                Đang định lượng...
              </span>
            ) : `▶  Định lượng ${target}g`}
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="w-full py-4 rounded-2xl text-sm font-bold text-gray-300 bg-[#111e2e] border border-gray-800 hover:border-gray-600 transition-all mb-3"
          >
            ↺  Làm mới
          </button>
        )}

        {/* Status line */}
        {status !== 'idle' && !isDone && (
          <div className={`text-center text-sm font-semibold mb-3 ${info.color}`}>
            {info.label}
            {ds && ds.attempts > 0 && (
              <span className="text-gray-600 text-xs ml-2">lần bơm {ds.attempts}</span>
            )}
          </div>
        )}

        {serverErr && (
          <div className="bg-red-900/30 border border-red-700/40 text-red-400 text-xs rounded-xl px-3 py-2.5 mb-3 text-center">
            {serverErr}
          </div>
        )}

        {/* Event log */}
        {ds && ds.log.length > 0 && (
          <div className="bg-[#080e18] border border-gray-800/60 rounded-2xl p-3.5 mt-1">
            <div className="text-[9px] uppercase tracking-[3px] text-gray-700 mb-2">Log</div>
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {ds.log.map((line, i) => (
                <div key={i} className={`text-[11px] font-mono leading-relaxed ${
                  line.includes('OK') || line.includes('✓')
                    ? 'text-emerald-400'
                    : line.includes('ERROR') || line.includes('EXCEPTION') || line.includes('⚠')
                    ? 'text-red-400'
                    : line.includes('Pump')
                    ? 'text-blue-400'
                    : 'text-gray-500'
                }`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
