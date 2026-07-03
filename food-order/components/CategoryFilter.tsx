'use client'

import { motion } from 'framer-motion'
import { LayoutGrid, TrendingUp, ChefHat, Fish, Sparkles, LucideIcon } from 'lucide-react'
import { categories } from '@/lib/menu'
import { Category } from '@/lib/types'
import clsx from 'clsx'

const CAT_ICONS: Record<string, LucideIcon> = {
  all:        LayoutGrid,
  bestseller: TrendingUp,
  classic:    ChefHat,
  seafood:    Fish,
  fusion:     Sparkles,
}

interface Props {
  active: Category
  onChange: (c: Category) => void
  counts: Record<string, number>
}

export default function CategoryFilter({ active, onChange, counts }: Props) {
  return (
    <div className="sticky top-[108px] z-30 bg-[var(--bg)] border-b border-[var(--border)]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-2 py-3 overflow-x-auto hide-scrollbar">
          {categories.map(cat => {
            const isActive = active === cat.key
            const count = counts[cat.key] ?? 0
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() => onChange(cat.key as Category)}
                className={clsx(
                  'relative shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95',
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'bg-white text-gray-600 border border-gray-100 hover:border-orange-200 hover:text-orange-500'
                )}
              >
                {(() => { const Icon = CAT_ICONS[cat.key]; return Icon ? <Icon size={14} strokeWidth={2} /> : null })()}
                <span>{cat.label}</span>
                <span className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  {count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="category-indicator"
                    className="absolute inset-0 bg-orange-500 rounded-xl -z-10"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
