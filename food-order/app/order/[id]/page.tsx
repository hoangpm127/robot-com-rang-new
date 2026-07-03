'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Phone, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Order, OrderStatus } from '@/lib/types'
import clsx from 'clsx'

const STEPS: { key: OrderStatus; label: string; desc: string; icon: string }[] = [
  { key: 'pending',   label: 'Chờ xác nhận', desc: 'Đơn hàng vừa được gửi',       icon: '📋' },
  { key: 'confirmed', label: 'Đã xác nhận',  desc: 'Nhà bếp đã nhận đơn',         icon: '✅' },
  { key: 'cooking',   label: 'Đang nấu',     desc: 'Món của bạn đang được chế biến', icon: '👨‍🍳' },
  { key: 'ready',     label: 'Sẵn sàng',     desc: 'Đơn hàng đã xong, đang lấy', icon: '🍱' },
  { key: 'delivered', label: 'Đã giao',      desc: 'Chúc bạn ngon miệng!',         icon: '🎉' },
]

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:   'text-yellow-600 bg-yellow-50 border-yellow-200',
  confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
  cooking:   'text-orange-600 bg-orange-50 border-orange-200',
  ready:     'text-green-600 bg-green-50 border-green-200',
  delivered: 'text-gray-600 bg-gray-50 border-gray-200',
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showItems, setShowItems] = useState(false)

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/orders/${id}`)
      if (!res.ok) { setNotFound(true); return }
      setOrder(await res.json())
    }
    fetch_()
    const iv = setInterval(fetch_, 5000)
    return () => clearInterval(iv)
  }, [id])

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="text-5xl">❓</span>
      <p className="text-gray-500 font-medium">Không tìm thấy đơn hàng</p>
      <Link href="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold">Về trang chủ</Link>
    </div>
  )

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full" />
    </div>
  )

  const currentIdx = STEPS.findIndex(s => s.key === order.status)
  const currentStep = STEPS[currentIdx]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Đơn #{order.id.toUpperCase()}</h1>
            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Current status hero */}
        <motion.div
          key={order.status}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 text-center shadow-sm"
        >
          <motion.div
            animate={order.status === 'cooking' ? { rotate: [0, -10, 10, -10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl mb-3 inline-block"
          >
            {currentStep.icon}
          </motion.div>
          <h2 className="text-xl font-extrabold text-gray-900">{currentStep.label}</h2>
          <p className="text-gray-400 text-sm mt-1">{currentStep.desc}</p>

          <div className={clsx('inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-bold border', STATUS_COLOR[order.status])}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {currentStep.label}
          </div>

          {order.status !== 'delivered' && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-gray-400 text-xs">
              <Clock size={12} />
              <span>Tự động cập nhật sau mỗi 5 giây</span>
            </div>
          )}
        </motion.div>

        {/* Progress timeline */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Tiến trình</p>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i < currentIdx
              const active = i === currentIdx
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={false}
                      animate={active ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ repeat: active ? Infinity : 0, duration: 2 }}
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0',
                        done   ? 'bg-green-500 text-white'
                        : active ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                        : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {done ? '✓' : step.icon}
                    </motion.div>
                    {i < STEPS.length - 1 && (
                      <div className={clsx('w-0.5 h-8 mt-1', done ? 'bg-green-300' : 'bg-gray-100')} />
                    )}
                  </div>
                  <div className="pt-1.5 pb-6">
                    <p className={clsx('font-semibold text-sm', active ? 'text-orange-500' : done ? 'text-gray-700' : 'text-gray-300')}>
                      {step.label}
                    </p>
                    <p className={clsx('text-xs mt-0.5', active ? 'text-orange-400' : done ? 'text-gray-400' : 'text-gray-200')}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order detail (collapsible) */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button type="button"
            onClick={() => setShowItems(v => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Chi tiết đơn ({order.items.length} món)
            </span>
            {showItems ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          <motion.div
            initial={false}
            animate={{ height: showItems ? 'auto' : 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
              {order.items.map(ci => (
                <div key={ci.item.id} className="pt-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">{ci.item.name} <span className="text-gray-400">×{ci.quantity}</span></span>
                    <span className="font-bold">{(ci.item.price * ci.quantity).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {ci.note && <p className="text-xs text-gray-400 mt-0.5">↳ {ci.note}</p>}
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-extrabold text-base">
                <span>Tổng cộng</span>
                <span className="text-orange-500">{order.total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
          {[
            { label: 'Khách hàng', value: order.customerName },
            { label: 'Điện thoại', value: order.customerPhone },
            ...(order.tableNumber ? [{ label: 'Bàn / Phòng', value: order.tableNumber }] : []),
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{r.label}</span>
              <span className="font-semibold text-gray-800">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a href="tel:+84912345678"
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl hover:bg-gray-50 transition-all text-sm">
            <Phone size={16} /> Gọi quán
          </a>
          <Link href="/"
            className="flex-1 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all text-sm">
            Đặt thêm món
          </Link>
        </div>
      </div>
    </div>
  )
}
