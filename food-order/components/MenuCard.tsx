'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Star, Clock, Minus, Plus, Flame, Sparkles, TrendingUp } from 'lucide-react'
import { MenuItem } from '@/lib/types'
import { useCart } from '@/context/CartContext'
import FoodImage from '@/components/FoodImage'
import clsx from 'clsx'

const TAG = {
  hot:        { label: 'Hot',      Icon: Flame,      cls: 'bg-red-500 text-white' },
  new:        { label: 'Mới',      Icon: Sparkles,   cls: 'bg-violet-500 text-white' },
  bestseller: { label: 'Bán chạy', Icon: TrendingUp, cls: 'bg-orange-500 text-white' },
}

export default function MenuCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const { add, setQty, items } = useCart()
  const cartItem = items.find(i => i.item.id === item.id)
  const qty = cartItem?.quantity ?? 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* Image */}
      <div className="relative h-36 sm:h-44 overflow-hidden bg-orange-50">
        <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
          <FoodImage
            src={item.image}
            alt={item.name}
            emoji={item.emoji}
            index={index}
          />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        {/* Tag */}
        {item.tag && (() => {
          const t = TAG[item.tag!]
          return (
            <span className={clsx('absolute top-2 left-2 text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1', t.cls)}>
              <t.Icon size={10} strokeWidth={2.5} />
              {t.label}
            </span>
          )
        })()}

        {/* Sold count */}
        <span className="absolute bottom-2 right-2 bg-black/45 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-lg">
          Đã bán {item.soldCount.toLocaleString()}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h3>
        <p className="text-gray-400 text-[11px] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Star size={11} strokeWidth={2} className="text-orange-400" />
            <span className="text-[11px] font-semibold text-gray-600">{item.rating}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock size={11} strokeWidth={2} />
            <span className="text-[11px]">{item.prepTime} phút</span>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-orange-500 font-extrabold text-base">
              {item.price.toLocaleString('vi-VN')}
            </span>
            <span className="text-orange-400 text-xs font-medium">đ</span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {qty === 0 ? (
              <motion.button
                key="add"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => add(item)}
                className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-90 text-white text-sm font-bold px-3 py-2 rounded-xl transition-all shadow-sm shadow-orange-200"
              >
                <Plus size={14} strokeWidth={3} />
                Thêm
              </motion.button>
            ) : (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  onClick={() => setQty(item.id, qty - 1)}
                  className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-100 active:bg-orange-200 transition-colors"
                >
                  <Minus size={13} strokeWidth={3} />
                </button>
                <span className="w-6 text-center font-extrabold text-orange-500 text-sm">{qty}</span>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  onClick={() => add(item)}
                  className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-100 active:bg-orange-200 transition-colors"
                >
                  <Plus size={13} strokeWidth={3} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
