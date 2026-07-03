'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { menu, categories } from '@/lib/menu'
import { Category } from '@/lib/types'
import MenuCard from '@/components/MenuCard'
import Navbar from '@/components/Navbar'
import CartSidebar from '@/components/CartSidebar'
import Hero from '@/components/Hero'
import CategoryFilter from '@/components/CategoryFilter'
import { useCart } from '@/context/CartContext'
import { ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const { count, total } = useCart()
  const router = useRouter()

  const filtered = useMemo(() => {
    let list = menu
    if (activeCategory === 'bestseller') list = list.filter(i => i.tag === 'bestseller')
    else if (activeCategory !== 'all') list = list.filter(i => i.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    }
    return list
  }, [activeCategory, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: menu.length }
    categories.forEach(cat => {
      if (cat.key === 'all') return
      if (cat.key === 'bestseller') c[cat.key] = menu.filter(i => i.tag === 'bestseller').length
      else c[cat.key] = menu.filter(i => i.category === cat.key).length
    })
    return c
  }, [])

  return (
    <div className="min-h-screen pb-28 md:pb-6">
      <Navbar onCartOpen={() => setCartOpen(true)} search={search} onSearch={setSearch} />
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
      <Hero />
      <CategoryFilter active={activeCategory} onChange={setActiveCategory} counts={counts} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-800 text-base">
              {categories.find(c => c.key === activeCategory)?.label ?? 'Tất cả'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} món</p>
          </div>
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center gap-3"
            >
              <span className="text-5xl">🔍</span>
              <p className="font-semibold text-gray-600">Không tìm thấy món phù hợp</p>
              <p className="text-sm text-gray-400">Thử từ khoá khác nhé</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory + search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <MenuCard item={item} index={i} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky bottom cart bar (mobile) */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-safe left-3 right-3 sm:left-4 sm:right-4 z-30 md:hidden"
          >
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="w-full bg-orange-500 text-white flex items-center justify-between px-5 py-4 rounded-2xl shadow-xl shadow-orange-300/50 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag size={20} strokeWidth={2} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-orange-500 text-[10px] font-black rounded-full flex items-center justify-center">
                    {count}
                  </span>
                </div>
                <span className="font-bold">{count} món trong giỏ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base">{total.toLocaleString('vi-VN')}đ</span>
                <span className="text-orange-200 text-lg">›</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
