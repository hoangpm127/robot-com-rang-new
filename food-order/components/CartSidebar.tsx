'use client'

import { useRouter } from 'next/navigation'
import FoodImage from '@/components/FoodImage'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, Trash2, ChevronRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'

export default function CartSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, remove, setQty, total, count } = useCart()
  const router = useRouter()

  const deliveryFee = 0
  const grandTotal = total + deliveryFee

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-orange-500" />
                <h2 className="font-bold text-gray-900 text-lg">Giỏ hàng</h2>
                {count > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Đóng giỏ hàng"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center"
                  >
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-4xl">
                      🍽️
                    </div>
                    <p className="font-semibold text-gray-700">Giỏ hàng trống</p>
                    <p className="text-sm text-gray-400">Thêm món ngon vào giỏ nào!</p>
                    <button type="button" onClick={onClose}
                      className="mt-2 text-orange-500 text-sm font-semibold hover:underline">
                      Xem thực đơn →
                    </button>
                  </motion.div>
                ) : (
                  items.map(ci => (
                    <motion.div
                      key={ci.item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      className="flex gap-3 bg-gray-50 rounded-2xl p-3"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        <FoodImage
                          src={ci.item.image}
                          alt={ci.item.name}
                          emoji={ci.item.emoji}
                          size="sm"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{ci.item.name}</p>
                          <button type="button" onClick={() => remove(ci.item.id)} aria-label="Xóa món"
                            className="shrink-0 w-5 h-5 text-gray-300 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-orange-500 font-bold text-sm mt-1">
                          {(ci.item.price * ci.quantity).toLocaleString('vi-VN')}đ
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <button type="button" aria-label="Giảm" onClick={() => setQty(ci.item.id, ci.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                              <Minus size={12} strokeWidth={2.5} />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-gray-800">{ci.quantity}</span>
                            <button type="button" aria-label="Tăng" onClick={() => setQty(ci.item.id, ci.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-colors">
                              <Plus size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-5 bg-white space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Tạm tính ({count} món)</span>
                    <span className="font-medium text-gray-700">{total.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Phí giao hàng</span>
                    <span className="font-semibold text-green-500">Miễn phí 🎉</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                    <span>Tổng cộng</span>
                    <span className="text-orange-500 text-lg">{grandTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { onClose(); router.push('/checkout') }}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                >
                  <span>Đặt hàng ngay</span>
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
