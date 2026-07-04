'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { MenuItem, Portion, PORTIONS } from '@/lib/types'
import { useCart } from '@/context/CartContext'
import FoodImage from '@/components/FoodImage'
import { useState } from 'react'

interface Props {
  item: MenuItem
  open: boolean
  onClose: () => void
}

export default function PortionSheet({ item, open, onClose }: Props) {
  const { addPortion } = useCart()
  const [selected, setSelected] = useState<Portion>('regular')

  const handleAdd = () => {
    addPortion(item, selected)
    onClose()
  }

  const portions = (Object.entries(PORTIONS) as [Portion, typeof PORTIONS[Portion]][])

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl max-w-lg mx-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Item preview */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-4 border-b border-gray-100">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-orange-50">
                <FoodImage src={item.image} alt={item.name} emoji={item.emoji} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base leading-tight">{item.name}</p>
                <p className="text-orange-500 font-semibold text-sm mt-0.5">
                  từ {item.price.toLocaleString('vi-VN')}đ
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            {/* Portion options */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Chọn suất</p>
              <div className="space-y-2.5">
                {portions.map(([key, info]) => {
                  const isSelected = selected === key
                  const finalPrice = item.price + info.extra
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-100 bg-gray-50 hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                        </div>
                        <div className="text-left">
                          <p className={`font-bold text-sm ${isSelected ? 'text-orange-600' : 'text-gray-800'}`}>
                            {info.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className={`font-extrabold text-sm ${isSelected ? 'text-orange-500' : 'text-gray-700'}`}>
                          {finalPrice.toLocaleString('vi-VN')}đ
                        </p>
                        {info.extra > 0 && (
                          <p className="text-[10px] text-gray-400">+{info.extra.toLocaleString('vi-VN')}đ</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pt-3 pb-6">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200 text-base"
              >
                Thêm vào giỏ — {(item.price + PORTIONS[selected].extra).toLocaleString('vi-VN')}đ
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
