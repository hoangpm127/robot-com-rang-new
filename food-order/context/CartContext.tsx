'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { CartItem, MenuItem, Portion, PORTIONS } from '@/lib/types'

interface CartState { items: CartItem[] }

type Action =
  | { type: 'ADD'; item: MenuItem; portion: Portion }
  | { type: 'REMOVE'; cartKey: string }
  | { type: 'SET_QTY'; cartKey: string; qty: number }
  | { type: 'SET_NOTE'; cartKey: string; note: string }
  | { type: 'CLEAR' }

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD': {
      const cartKey = `${action.item.id}-${action.portion}`
      const exists = state.items.find(i => i.cartKey === cartKey)
      if (exists) {
        return { items: state.items.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i) }
      }
      return { items: [...state.items, { cartKey, item: action.item, portion: action.portion, quantity: 1, note: '' }] }
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.cartKey !== action.cartKey) }
    case 'SET_QTY':
      if (action.qty <= 0) return { items: state.items.filter(i => i.cartKey !== action.cartKey) }
      return { items: state.items.map(i => i.cartKey === action.cartKey ? { ...i, quantity: action.qty } : i) }
    case 'SET_NOTE':
      return { items: state.items.map(i => i.cartKey === action.cartKey ? { ...i, note: action.note } : i) }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

interface CartContextType {
  items: CartItem[]
  addPortion: (item: MenuItem, portion: Portion) => void
  remove: (cartKey: string) => void
  setQty: (cartKey: string, qty: number) => void
  setNote: (cartKey: string, note: string) => void
  clear: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })

  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        parsed.forEach((ci: CartItem) =>
          dispatch({ type: 'ADD', item: ci.item, portion: ci.portion ?? 'regular' })
        )
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.items))
  }, [state.items])

  const total = state.items.reduce((s, i) => s + (i.item.price + PORTIONS[i.portion].extra) * i.quantity, 0)
  const count = state.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items: state.items,
      addPortion: (item, portion) => dispatch({ type: 'ADD', item, portion }),
      remove: cartKey => dispatch({ type: 'REMOVE', cartKey }),
      setQty: (cartKey, qty) => dispatch({ type: 'SET_QTY', cartKey, qty }),
      setNote: (cartKey, note) => dispatch({ type: 'SET_NOTE', cartKey, note }),
      clear: () => dispatch({ type: 'CLEAR' }),
      total,
      count,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
