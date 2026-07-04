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

export type Portion = 'regular' | 'full' | 'special'

export const PORTIONS: Record<Portion, { label: string; desc: string; extra: number }> = {
  regular: { label: 'Suất thường',   desc: 'Khẩu phần tiêu chuẩn',           extra: 0 },
  full:    { label: 'Suất đầy đủ',   desc: 'Thêm cơm + thêm nhân đậm đà',    extra: 10000 },
  special: { label: 'Suất đặc biệt', desc: 'Phần lớn + topping cao cấp',      extra: 20000 },
}

export interface CartItem {
  cartKey: string   // `${item.id}-${portion}`
  item: MenuItem
  portion: Portion
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
