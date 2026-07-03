'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { CartItem, MenuItem } from '@/lib/types'

interface CartState {
  items: CartItem[]
}

type Action =
  | { type: 'ADD'; item: MenuItem }
  | { type: 'REMOVE'; id: string }
  | { type: 'SET_QTY'; id: string; qty: number }
  | { type: 'SET_NOTE'; id: string; note: string }
  | { type: 'CLEAR' }

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD': {
      const exists = state.items.find(i => i.item.id === action.item.id)
      if (exists) {
        return {
          items: state.items.map(i =>
            i.item.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, { item: action.item, quantity: 1, note: '' }] }
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.item.id !== action.id) }
    case 'SET_QTY':
      if (action.qty <= 0) return { items: state.items.filter(i => i.item.id !== action.id) }
      return {
        items: state.items.map(i =>
          i.item.id === action.id ? { ...i, quantity: action.qty } : i
        ),
      }
    case 'SET_NOTE':
      return {
        items: state.items.map(i =>
          i.item.id === action.id ? { ...i, note: action.note } : i
        ),
      }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

interface CartContextType {
  items: CartItem[]
  add: (item: MenuItem) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  setNote: (id: string, note: string) => void
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
        parsed.forEach((ci: CartItem) => dispatch({ type: 'ADD', item: ci.item }))
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.items))
  }, [state.items])

  const total = state.items.reduce((s, i) => s + i.item.price * i.quantity, 0)
  const count = state.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        add: item => dispatch({ type: 'ADD', item }),
        remove: id => dispatch({ type: 'REMOVE', id }),
        setQty: (id, qty) => dispatch({ type: 'SET_QTY', id, qty }),
        setNote: (id, note) => dispatch({ type: 'SET_NOTE', id, note }),
        clear: () => dispatch({ type: 'CLEAR' }),
        total,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
