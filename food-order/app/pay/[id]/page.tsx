'use client'

import { useState, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Shield, Fingerprint, ChevronLeft } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type PageState = 'confirm' | 'processing' | 'success'

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const [state, setState] = useState<PageState>('confirm')

  // Read order data from URL params — no server fetch needed across instances
  const total = Number(searchParams.get('t') ?? 0)
  const portionCount = Number(searchParams.get('n') ?? 1)

  const handleConfirm = async () => {
    setState('processing')
    await new Promise(r => setTimeout(r, 1800)) // simulate biometric delay
    // POST to edge runtime endpoint — V8 isolate shared with checkout polling
    await fetch(`/api/payment/${id}`, { method: 'POST' })
    setState('success')
  }

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

          {/* Confirm / Processing */}
          {(state === 'confirm' || state === 'processing') && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col px-5 pt-7 pb-8 gap-5">

              {/* Merchant */}
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

              {/* Amount */}
              <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">Số tiền thanh toán</p>
                <p className="text-5xl font-black text-gray-900 tabular-nums">
                  {total.toLocaleString('vi-VN')}
                  <span className="text-2xl text-gray-400 font-semibold ml-1">đ</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">{portionCount} suất cơm rang</p>
              </div>

              {/* Account */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
                <span className="text-gray-400">Tài khoản nguồn</span>
                <span className="font-semibold text-gray-700">**** **** 1247</span>
              </div>

              <div className="flex-1" />

              {/* CTA */}
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

          {/* Success */}
          {state === 'success' && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-5 text-center">

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.1 }}>
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={52} className="text-green-500" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-2xl font-extrabold text-gray-900">Giao dịch thành công</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {total.toLocaleString('vi-VN')}đ đã được ghi nhận
                </p>
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

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-xs text-gray-400">
                Bạn có thể đóng trang này
              </motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
