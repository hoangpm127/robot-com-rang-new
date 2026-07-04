'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Clock, Plus, Flame, Sparkles, TrendingUp } from 'lucide-react'
import { MenuItem } from '@/lib/types'
import { useCart } from '@/context/CartContext'
import FoodImage from '@/components/FoodImage'
import PortionSheet from '@/components/PortionSheet'
import clsx from 'clsx'

const TAG = {
  hot:        { label: 'Hot',      Icon: Flame,      cls: 'bg-red-500 text-white' },
  new:        { label: 'Mới',      Icon: Sparkles,   cls: 'bg-violet-500 text-white' },
  bestseller: { label: 'Bán chạy', Icon: TrendingUp, cls: 'bg-orange-500 text-white' },
}

export default function MenuCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const { items } = useCart()
  const [sheetOpen, setSheetOpen] = useState(false)

  const cartCount = items
    .filter(i => i.item.id === item.id)
    .reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
      >
        {/* Image */}
        <div className="relative h-36 sm:h-44 overflow-hidden bg-orange-50">
          <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
            <FoodImage src={item.image} alt={item.name} emoji={item.emoji} index={index} />
          </div>
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

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="relative flex items-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-90 text-white text-sm font-bold px-3 py-2 rounded-xl transition-all shadow-sm shadow-orange-200"
            >
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <Plus size={14} strokeWidth={3} />
              Thêm
            </button>
          </div>
        </div>
      </motion.div>

      <PortionSheet item={item} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
