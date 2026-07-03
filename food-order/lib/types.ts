export type Category = 'all' | 'classic' | 'seafood' | 'fusion' | 'bestseller'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  emoji: string
  category: Category
  tag?: 'hot' | 'new' | 'bestseller'
  rating: number
  soldCount: number
  prepTime: number  // minutes
}

export interface CartItem {
  item: MenuItem
  quantity: number
  note: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered'

export interface Order {
  id: string
  items: CartItem[]
  customerName: string
  customerPhone: string
  tableNumber: string
  note: string
  status: OrderStatus
  total: number
  createdAt: string
}
