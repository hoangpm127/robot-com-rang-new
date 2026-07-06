'use client'

import { useState, use, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Shield, Fingerprint, ChevronLeft, BellRing, Clock } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type PageState = 'confirm' | 'processing' | 'success' | 'queued' | 'cooking' | 'ready'

const COOK_SECONDS = 60

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const [state, setState] = useState<PageState>('confirm')
  const [countdown, setCountdown] = useState(3)       // 3s after payment success
  const [queueLeft, setQueueLeft] = useState(0)        // wait for robot to be free
  const [cookLeft, setCookLeft] = useState(COOK_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queueSecsRef = useRef(0)                       // avoid stale closure in effect

  const total = Number(searchParams.get('t') ?? 0)
  const portionCount = Number(searchParams.get('n') ?? 1)

  const handleConfirm = async () => {
    setState('processing')
    await new Promise(r => setTimeout(r, 1800))
    const res = await fetch(`/api/payment/${id}`, { method: 'POST' })
    const data = await res.json()
    // waitMs: how long until robot is free (0 = free now)
    // subtract ~3s because we show success screen first before cooking starts
    const rawSecs = Math.round((data.waitMs ?? 0) / 1000)
    queueSecsRef.current = Math.max(0, rawSecs - 3)
    setState('success')

    // Trigger the robot's actual cook cycle (dosing + scoop/pour/place).
    // Best-effort: if the robot PC/ngrok tunnel is down, don't block the
    // customer's success screen on it — the cooking countdown shown here
    // is a simulated estimate either way.
    fetch('/api/robot/cook_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: id, item_count: portionCount, total }),
    }).catch(() => {})
  }

  // 3s countdown on success screen → queued or cooking
  useEffect(() => {
    if (state !== 'success') return
    setCountdown(3)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          if (queueSecsRef.current > 0) {
            setQueueLeft(queueSecsRef.current)
            setState('queued')
          } else {
            setState('cooking')
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  // Queue wait countdown → cooking
  useEffect(() => {
    if (state !== 'queued') return
    timerRef.current = setInterval(() => {
      setQueueLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setState('cooking')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  // 60s cooking countdown → ready
  useEffect(() => {
    if (state !== 'cooking') return
    setCookLeft(COOK_SECONDS)
    timerRef.current = setInterval(() => {
      setCookLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setState('ready')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  const cookProgress = cookLeft / COOK_SECONDS
  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(160deg,#1a237e_0%,#0d47a1_40%,#1565c0_100%)]">

      {/* Bank header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-5">
        <button type="button" aria-label="Quay lại" className="text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-white font-black text-lg tracking-tight">VietPay</p>
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Internet Banking</p>
        </div>
        <div className="flex items-center gap-1 text-white/50 text-xs">
          <Shield size={12} strokeWidth={2} />
          <span>SSL</span>
        </div>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-[32px] flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── Confirm / Processing ── */}
          {(state === 'confirm' || state === 'processing') && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col px-5 pt-7 pb-8 gap-5">

              <div className="flex items-center gap-3.5 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-2xl shadow-md bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 11h16" /><path d="M5.5 11c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5" />
                    <path d="M9 9c0-1.2 1.2-1.8 1.2-3" /><path d="M12 9c0-1.2 1.2-1.8 1.2-3" /><path d="M15 9c0-1.2 1.2-1.8 1.2-3" />
                  </svg>
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-base">Cơm Rang 247</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mã GD: #{id.toUpperCase()}</p>
                  <p className="text-xs text-gray-400">
                    {new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">Số tiền thanh toán</p>
                <p className="text-5xl font-black text-gray-900 tabular-nums">
                  {total.toLocaleString('vi-VN')}
                  <span className="text-2xl text-gray-400 font-semibold ml-1">đ</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">{portionCount} suất cơm rang</p>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
                <span className="text-gray-400">Tài khoản nguồn</span>
                <span className="font-semibold text-gray-700">**** **** 1247</span>
              </div>

              <div className="flex-1" />

              <AnimatePresence mode="wait">
                {state === 'confirm' && (
                  <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-center text-xs text-gray-400 mb-3">Xác nhận bằng vân tay hoặc khuôn mặt</p>
                    <button type="button" onClick={handleConfirm}
                      className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-xl bg-[linear-gradient(135deg,#1a237e,#1565c0)]">
                      <Fingerprint size={22} strokeWidth={1.8} />
                      XÁC NHẬN THANH TOÁN
                    </button>
                  </motion.div>
                )}
                {state === 'processing' && (
                  <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 py-2">
                    <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-semibold">Đang xử lý giao dịch...</p>
                    <p className="text-xs text-gray-400">Vui lòng không tắt màn hình</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Payment Success (3s) ── */}
          {state === 'success' && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-5 text-center">

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.1 }}>
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={52} className="text-green-500" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-2xl font-extrabold text-gray-900">Giao dịch thành công</h2>
                <p className="text-gray-400 text-sm mt-1">{total.toLocaleString('vi-VN')}đ đã được ghi nhận</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="w-full bg-green-50 border border-green-200 rounded-2xl p-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Đơn hàng</span>
                  <span className="font-extrabold text-green-600">#{id.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Số tiền</span>
                  <span className="font-bold text-gray-800">{total.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Trạng thái</span>
                  <span className="font-bold text-green-600">✓ Đã xác nhận</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex items-center gap-2 text-sm text-gray-400">
                <span>Chuyển sang theo dõi đơn sau</span>
                <AnimatePresence mode="wait">
                  <motion.span key={countdown}
                    initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                    className="inline-flex w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-extrabold text-sm items-center justify-center">
                    {countdown}
                  </motion.span>
                </AnimatePresence>
                <span>giây...</span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Queued: waiting for robot ── */}
          {state === 'queued' && (
            <motion.div key="queued" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6 text-center">

              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center shadow-lg shadow-blue-100">
                  <Clock size={52} strokeWidth={1.4} className="text-blue-400" />
                </div>
                {/* Orbiting dot */}
                <motion.div className="absolute w-4 h-4 rounded-full bg-blue-400 top-0 right-2 shadow-md"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '-42px 52px' }}
                />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Đơn bạn đã vào hàng</h2>
                <p className="text-gray-400 text-sm mt-1">Robot đang nấu cho khách trước, chờ tí nhé!</p>
              </div>

              <div className="text-5xl font-black tabular-nums text-blue-500">
                {fmtSecs(queueLeft)}
              </div>

              <div className="w-full space-y-2">
                <div className="h-3 bg-blue-100 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(queueLeft / queueSecsRef.current) * 100}%` }}
                    transition={{ duration: 0.9, ease: 'linear' }}
                  />
                </div>
                <p className="text-xs text-gray-400">Còn khoảng {queueLeft} giây đến lượt bạn</p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-500 text-sm font-semibold">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Robot đang bận — sắp đến lượt bạn
              </div>
            </motion.div>
          )}

          {/* ── Cooking ── */}
          {state === 'cooking' && (
            <motion.div key="cooking" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6 text-center">

              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-100 to-amber-50 border-2 border-orange-200 flex items-center justify-center shadow-lg shadow-orange-100">
                  <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 11h16" />
                    <path d="M5.5 11c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5" />
                    <path d="M9 9c0-1.2 1.2-1.8 1.2-3" />
                    <path d="M12 9c0-1.2 1.2-1.8 1.2-3" />
                    <path d="M15 9c0-1.2 1.2-1.8 1.2-3" />
                  </svg>
                </div>
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    className="absolute w-2 h-2 rounded-full bg-orange-300/60"
                    style={{ left: `${28 + i * 22}%`, top: '-8px' }}
                    animate={{ y: [-4, -14, -4], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.6, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Đang rang cơm cho bạn</h2>
                <p className="text-gray-400 text-sm mt-1">Vui lòng chờ trong giây lát nhé!</p>
              </div>

              <div className="text-5xl font-black tabular-nums text-orange-500">
                {fmtSecs(cookLeft)}
              </div>

              <div className="w-full space-y-2">
                <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                    initial={{ width: '100%' }}
                    animate={{ width: `${cookProgress * 100}%` }}
                    transition={{ duration: 0.9, ease: 'linear' }}
                  />
                </div>
                <p className="text-xs text-gray-400">Còn khoảng {cookLeft} giây nữa</p>
              </div>

              <p className="text-xs text-gray-300">Cơm rang tươi, nấu tại chỗ — không chờ lâu đâu!</p>
            </motion.div>
          )}

          {/* ── Ready to pickup ── */}
          {state === 'ready' && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6 text-center">

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 8, stiffness: 200 }}>
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-2xl shadow-orange-200">
                  <BellRing size={56} strokeWidth={1.5} className="text-white" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">Cơm đã sẵn sàng!</h2>
                <p className="text-orange-500 font-bold text-lg mt-2">
                  Xin mời quý khách ra quầy lấy đồ nhé
                </p>
                <p className="text-gray-400 text-sm mt-2">Cảm ơn bạn đã tin tưởng Cơm Rang 247</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="w-full bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-1">
                <p className="text-xs text-gray-400">Mã đơn của bạn</p>
                <p className="font-extrabold text-orange-500 text-2xl tracking-widest">#{id.toUpperCase()}</p>
                <p className="text-xs text-gray-400">Vui lòng xuất trình mã này khi lấy đồ</p>
              </motion.div>

              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full text-green-600 text-sm font-semibold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Đang chờ bạn tại quầy
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
