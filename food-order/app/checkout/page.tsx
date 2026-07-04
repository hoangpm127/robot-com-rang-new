'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, User, Phone, Hash, MessageSquare, CheckCircle2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { PORTIONS } from '@/lib/types'
import clsx from 'clsx'

type Step = 'info' | 'review' | 'done'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clear, setNote } = useCart()
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState({ name: '', phone: '', table: '', note: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState('')

  if (items.length === 0 && step !== 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="text-6xl">🛒</span>
        <p className="text-gray-500 font-medium">Giỏ hàng trống</p>
        <Link href="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Chọn món ngay
        </Link>
      </div>
    )
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên'
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại'
    else if (!/^[0-9]{9,11}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại không hợp lệ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: form.name, customerPhone: form.phone, tableNumber: form.table, note: form.note, items, total }),
      })
      const order = await res.json()
      setOrderId(order.id)
      clear()
      setStep('done')
    } catch {
      setErrors({ submit: 'Đặt hàng thất bại, vui lòng thử lại' })
    } finally {
      setLoading(false)
    }
  }

  const STEPS = [
    { key: 'info',   label: 'Thông tin' },
    { key: 'review', label: 'Xem lại' },
    { key: 'done',   label: 'Xác nhận' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          {step !== 'done' && (
            <Link href="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </Link>
          )}
          <h1 className="font-bold text-gray-900">Đặt hàng</h1>
        </div>

        {/* Step indicator */}
        {step !== 'done' && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="flex items-center gap-2">
              {STEPS.filter(s => s.key !== 'done').map((s, i) => (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    step === s.key ? 'bg-orange-500 text-white scale-110'
                    : (step === 'review' && i === 0) ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                  )}>
                    {(step === 'review' && i === 0) ? '✓' : i + 1}
                  </div>
                  <span className={clsx('text-xs font-medium', step === s.key ? 'text-orange-500' : 'text-gray-400')}>
                    {s.label}
                  </span>
                  {i < 1 && <div className={clsx('flex-1 h-px', step === 'review' ? 'bg-orange-300' : 'bg-gray-200')} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <AnimatePresence mode="wait">

          {/* Step 1: Info */}
          {step === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Order summary preview */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Đơn hàng ({items.length} món)</p>
                <div className="space-y-1.5">
                  {items.map(ci => {
                    const linePrice = (ci.item.price + PORTIONS[ci.portion].extra) * ci.quantity
                    return (
                      <div key={ci.cartKey} className="flex justify-between text-sm">
                        <span className="text-gray-700 truncate mr-2">
                          {ci.item.name}
                          <span className="text-orange-400 text-[10px] ml-1">({PORTIONS[ci.portion].label})</span>
                          <span className="text-gray-400"> ×{ci.quantity}</span>
                        </span>
                        <span className="font-semibold shrink-0">{linePrice.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
                  <span>Tổng</span>
                  <span className="text-orange-500">{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Form */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Thông tin khách hàng</p>

                {[
                  { key: 'name', label: 'Họ tên', icon: User, placeholder: 'Nguyễn Văn A', type: 'text', required: true },
                  { key: 'phone', label: 'Số điện thoại', icon: Phone, placeholder: '0912 345 678', type: 'tel', required: true },
                  { key: 'table', label: 'Số bàn / Phòng', icon: Hash, placeholder: 'Bàn 5, Tầng 2...', type: 'text', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
                      <f.icon size={12} />
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={clsx(
                        'w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all',
                        errors[f.key] ? 'border-red-300 focus:ring-red-200' : 'border-gray-100 focus:ring-orange-200 focus:border-orange-300'
                      )}
                    />
                    {errors[f.key] && <p className="text-red-500 text-xs mt-1">{errors[f.key]}</p>}
                  </div>
                ))}

                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
                    <MessageSquare size={12} />
                    Ghi chú chung
                  </label>
                  <textarea
                    value={form.note}
                    onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                    placeholder="Yêu cầu thêm, dị ứng thực phẩm..."
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                  />
                </div>
              </div>

              {/* Ghi chú từng món */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ghi chú theo món</p>
                {items.map(ci => (
                  <div key={ci.cartKey}>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">
                      {ci.item.name} <span className="text-orange-400">({PORTIONS[ci.portion].label})</span>
                    </label>
                    <input
                      value={ci.note}
                      onChange={e => setNote(ci.cartKey, e.target.value)}
                      placeholder="Ít cay, không hành, thêm trứng..."
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => validate() && setStep('review')}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200">
                Xem lại đơn hàng →
              </button>
            </motion.div>
          )}

          {/* Step 2: Review */}
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Thông tin</p>
                {[
                  { label: 'Tên', value: form.name },
                  { label: 'SĐT', value: form.phone },
                  ...(form.table ? [{ label: 'Bàn', value: form.table }] : []),
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                    <span className="text-gray-400">{r.label}</span>
                    <span className="font-semibold text-gray-800">{r.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Chi tiết món</p>
                <div className="space-y-2">
                  {items.map(ci => {
                    const linePrice = (ci.item.price + PORTIONS[ci.portion].extra) * ci.quantity
                    return (
                      <div key={ci.cartKey} className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">
                            {ci.item.name}
                            <span className="text-orange-400 text-[10px] ml-1">({PORTIONS[ci.portion].label})</span>
                            <span className="text-gray-400"> ×{ci.quantity}</span>
                          </span>
                          <span className="font-bold">{linePrice.toLocaleString('vi-VN')}đ</span>
                        </div>
                        {ci.note && <p className="text-xs text-gray-400 mt-0.5">↳ {ci.note}</p>}
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Phí giao hàng</span>
                    <span className="text-green-500 font-semibold">Miễn phí 🎉</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-base">
                    <span>Tổng cộng</span>
                    <span className="text-orange-500">{total.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Thanh toán</p>
                <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <span className="text-2xl">💵</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Thanh toán khi nhận</p>
                    <p className="text-xs text-gray-400">Tiền mặt hoặc chuyển khoản</p>
                  </div>
                  <CheckCircle2 size={18} className="text-orange-500 ml-auto" />
                </div>
              </div>

              {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('info')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold py-4 rounded-2xl transition-all">
                  ← Sửa lại
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200">
                  {loading ? '⏳ Đang đặt...' : '✓ Xác nhận đặt hàng'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 size={48} className="text-green-500" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Đặt hàng thành công!</h2>
                <p className="text-gray-500 mt-1">Nhà bếp đã nhận đơn của bạn 🍳</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 w-full max-w-xs">
                <p className="text-xs text-gray-400 mb-1">Mã đơn hàng</p>
                <p className="font-extrabold text-orange-500 text-xl tracking-widest">#{orderId.toUpperCase()}</p>
              </div>
              <p className="text-sm text-gray-400">Dự kiến giao trong <span className="font-bold text-gray-700">15–25 phút</span></p>
              <div className="flex gap-3 w-full mt-2">
                <button type="button" onClick={() => router.push(`/order/${orderId}`)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200">
                  Theo dõi đơn →
                </button>
                <Link href="/" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all text-center flex items-center justify-center">
                  Đặt thêm
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
