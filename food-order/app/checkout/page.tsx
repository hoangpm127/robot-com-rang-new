'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { PORTIONS } from '@/lib/types'

type PageState = 'creating' | 'waiting' | 'success'

export default function CheckoutPage() {
  const { items, total, clear } = useCart()
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('creating')
  const [orderId, setOrderId] = useState('')
  const [payUrl, setPayUrl] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const createdRef = useRef(false)

  // Create order on mount (once)
  useEffect(() => {
    if (createdRef.current || items.length === 0) return
    createdRef.current = true
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Khách quét QR',
        customerPhone: '0000000000',
        tableNumber: '',
        note: '',
        items,
        total,
      }),
    })
      .then(r => r.json())
      .then(order => {
        if (order.id) {
          const portionCount = items.reduce((s, i) => s + i.quantity, 0)
          setOrderId(order.id)
          // Encode total+count in URL so phone doesn't need to fetch order from server
          setPayUrl(`${window.location.origin}/pay/${order.id}?t=${order.total}&n=${portionCount}`)
          setPageState('waiting')
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for payment confirmation
  useEffect(() => {
    if (pageState !== 'waiting' || !orderId) return
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/payment/${orderId}`)
        const o = await r.json()
        if (o.confirmed) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          clear()
          setPageState('success')
        }
      } catch {}
    }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pageState, orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const qrSrc = payUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payUrl)}&bgcolor=ffffff&color=111827&margin=12`
    : ''

  if (items.length === 0 && pageState !== 'success' && pageState !== 'creating') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-medium">Giỏ hàng trống</p>
        <Link href="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold">
          Chọn món ngay
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <AnimatePresence mode="wait">

        {/* Creating order */}
        {pageState === 'creating' && (
          <motion.div key="creating" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Đang tạo đơn hàng...</p>
          </motion.div>
        )}

        {/* QR waiting */}
        {pageState === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-4">

            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg shadow-orange-200 bg-gradient-to-br from-orange-500 to-amber-400">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11h16" /><path d="M5.5 11c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5" />
                  <path d="M9 9c0-1.2 1.2-1.8 1.2-3" /><path d="M12 9c0-1.2 1.2-1.8 1.2-3" /><path d="M15 9c0-1.2 1.2-1.8 1.2-3" />
                </svg>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900">Quét mã để thanh toán</h1>
              <p className="text-gray-400 text-sm mt-1">Dùng camera điện thoại quét mã QR bên dưới</p>
            </div>

            {/* QR Card */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              {/* Amount */}
              <div className="text-center mb-5">
                <p className="text-4xl font-black text-gray-900 tabular-nums">
                  {total.toLocaleString('vi-VN')}
                  <span className="text-xl text-gray-400 font-semibold">đ</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {items.reduce((s, i) => s + i.quantity, 0)} suất • Mã đơn #{orderId.toUpperCase()}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-5">
                <div className="relative p-2.5 border-2 border-dashed border-orange-200 rounded-2xl bg-orange-50/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt="QR thanh toán" width={200} height={200} className="rounded-xl block" />
                  {/* Center brand badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-11 h-11 bg-white rounded-xl shadow-md flex items-center justify-center border border-orange-100">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 11h16" /><path d="M5.5 11c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status pulse */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Đang chờ xác nhận thanh toán...
              </div>
            </div>

            {/* Items summary */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Chi tiết đơn hàng</p>
              <div className="space-y-2">
                {items.map(ci => {
                  const linePrice = (ci.item.price + PORTIONS[ci.portion].extra) * ci.quantity
                  return (
                    <div key={ci.cartKey} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">
                        {ci.item.name}
                        <span className="text-orange-400 text-[10px] ml-1">({PORTIONS[ci.portion].label})</span>
                        {ci.quantity > 1 && <span className="text-gray-400"> ×{ci.quantity}</span>}
                      </span>
                      <span className="font-semibold shrink-0 text-gray-800">
                        {linePrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )
                })}
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-gray-600">Tổng cộng</span>
                  <span className="text-orange-500">{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            {/* Dev link */}
            <p className="text-center text-[11px] text-gray-300">
              Không có điện thoại?{' '}
              <a href={payUrl} target="_blank" rel="noopener noreferrer"
                className="text-orange-400 underline underline-offset-2">
                Mở trang xác nhận →
              </a>
            </p>
          </motion.div>
        )}

        {/* Success */}
        {pageState === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center gap-5 max-w-xs">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={52} className="text-green-500" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Thanh toán thành công!</h2>
              <p className="text-gray-400 text-sm mt-1">Nhà bếp đã nhận đơn của bạn 🍱</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 w-full">
              <p className="text-xs text-gray-400 mb-1">Mã đơn hàng</p>
              <p className="font-extrabold text-orange-500 text-xl tracking-widest">
                #{orderId.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button type="button" onClick={() => router.push(`/order/${orderId}`)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200">
                Theo dõi đơn →
              </button>
              <Link href="/"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all text-center flex items-center justify-center">
                Trang chủ
              </Link>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
