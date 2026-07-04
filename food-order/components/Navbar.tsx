'use client'

import { ShoppingBag, Search } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { motion, AnimatePresence } from 'framer-motion'

interface NavbarProps {
  onCartOpen: () => void
  search: string
  onSearch: (v: string) => void
}

export default function Navbar({ onCartOpen, search, onSearch }: NavbarProps) {
  const { count, total } = useCart()

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top bar */}
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-orange-200 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11h16" />
                <path d="M5.5 11c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5" />
                <path d="M9 9c0-1.2 1.2-1.8 1.2-3" />
                <path d="M12 9c0-1.2 1.2-1.8 1.2-3" />
                <path d="M15 9c0-1.2 1.2-1.8 1.2-3" />
              </svg>
            </div>
            <div>
              <p className="font-extrabold text-gray-900 text-sm leading-none">Cơm Rang 247</p>
              <p className="text-[10px] text-orange-500 font-medium mt-0.5">Ngon mỗi ngày</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCartOpen}
            className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white pl-3 pr-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm shadow-orange-200"
          >
            <ShoppingBag size={16} strokeWidth={2.5} />
            <AnimatePresence mode="wait">
              {count > 0 ? (
                <motion.span
                  key="with-items"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="text-sm font-bold"
                >
                  {total.toLocaleString('vi-VN')}đ
                </motion.span>
              ) : (
                <motion.span
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-semibold"
                >
                  Giỏ hàng
                </motion.span>
              )}
            </AnimatePresence>
            {count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center"
              >
                {count}
              </motion.span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Tìm món ăn..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
