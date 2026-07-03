'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Clock, ChefHat, CheckCircle, Package, Truck } from 'lucide-react'
import { Order, OrderStatus } from '@/lib/types'
import clsx from 'clsx'

const TABS: { key: OrderStatus | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all',       label: 'Tất cả',    icon: <Package size={14} />,     color: 'gray' },
  { key: 'pending',   label: 'Chờ xử lý', icon: <Clock size={14} />,       color: 'yellow' },
  { key: 'confirmed', label: 'Xác nhận',  icon: <CheckCircle size={14} />, color: 'blue' },
  { key: 'cooking',   label: 'Đang nấu',  icon: <ChefHat size={14} />,     color: 'orange' },
  { key: 'ready',     label: 'Sẵn sàng',  icon: <Package size={14} />,     color: 'green' },
  { key: 'delivered', label: 'Đã giao',   icon: <Truck size={14} />,       color: 'gray' },
]

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   'confirmed',
  confirmed: 'cooking',
  cooking:   'ready',
  ready:     'delivered',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   '⏳ Chờ',
  confirmed: '✅ Xác nhận',
  cooking:   '👨‍🍳 Đang nấu',
  ready:     '🍱 Sẵn sàng',
  delivered: '✓ Đã giao',
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  cooking:   'bg-orange-100 text-orange-700 border-orange-200',
  ready:     'bg-green-100 text-green-700 border-green-200',
  delivered: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/orders')
    if (res.ok) {
      setOrders(await res.json())
      setLastRefresh(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchOrders()
    const iv = setInterval(fetchOrders, 10000)
    return () => clearInterval(iv)
  }, [authed, fetchOrders])

  async function updateStatus(id: string, status: OrderStatus) {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchOrders()
  }

  if (!authed) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="font-extrabold text-xl text-gray-900 mb-1">Kitchen View</h1>
        <p className="text-gray-400 text-sm mb-6">Cơm Rang 247 — Nội bộ</p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pw === 'admin247' && setAuthed(true)}
          placeholder="Mật khẩu..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
        />
        <button type="button"
          onClick={() => pw === 'admin247' ? setAuthed(true) : alert('Sai mật khẩu')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all"
        >
          Đăng nhập
        </button>
        <p className="text-xs text-gray-300 mt-4">Mật khẩu: admin247</p>
      </motion.div>
    </div>
  )

  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab)
  const counts = Object.fromEntries(
    TABS.map(t => [t.key, t.key === 'all' ? orders.length : orders.filter(o => o.status === t.key).length])
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍳</span>
            <div>
              <p className="font-extrabold text-white text-sm">Kitchen View</p>
              <p className="text-xs text-gray-400">Cơm Rang 247</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <p className="text-xs text-gray-500 hidden sm:block">
                {lastRefresh.toLocaleTimeString('vi-VN')}
              </p>
            )}
            <button type="button" onClick={fetchOrders}
              className={clsx('flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition-colors', loading && 'opacity-50')}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Tải lại
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {TABS.map(t => (
            <div key={t.key} className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className="text-2xl font-extrabold text-white">{counts[t.key]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
          {TABS.map(t => (
            <button type="button" key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                tab === t.key ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {t.icon}
              {t.label}
              {counts[t.key] > 0 && (
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-bold', tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-300')}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Order cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-2">📭</p>
            <p>Không có đơn hàng nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filtered.map(order => (
                <motion.div key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div>
                      <p className="font-bold text-white text-sm">#{order.id.toUpperCase()}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleTimeString('vi-VN')}</p>
                    </div>
                    <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-lg border', STATUS_STYLE[order.status])}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-sm font-semibold text-white">{order.customerName}</p>
                    <p className="text-xs text-gray-400">{order.customerPhone}{order.tableNumber ? ` · ${order.tableNumber}` : ''}</p>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 space-y-1.5">
                    {order.items.map(ci => (
                      <div key={ci.item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300 truncate mr-2">{ci.item.name} <span className="text-gray-500">×{ci.quantity}</span></span>
                        <span className="text-orange-400 font-semibold shrink-0">{(ci.item.price * ci.quantity).toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                    {order.note && (
                      <p className="text-xs text-gray-500 bg-gray-800 rounded-lg px-2 py-1.5 mt-1">📝 {order.note}</p>
                    )}
                  </div>

                  {/* Total + Actions */}
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                    <div className="flex justify-between mb-3">
                      <span className="text-gray-400 text-sm">Tổng cộng</span>
                      <span className="text-orange-400 font-extrabold">{order.total.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {NEXT_STATUS[order.status] && (
                      <button type="button"
                        onClick={() => updateStatus(order.id, NEXT_STATUS[order.status]!)}
                        className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3 rounded-xl transition-all text-sm"
                      >
                        → {STATUS_LABEL[NEXT_STATUS[order.status]!]}
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <div className="w-full text-center text-green-400 font-semibold text-sm py-3 bg-green-500/10 rounded-xl">
                        ✓ Hoàn thành
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
