import { Order, OrderStatus } from './types'

// In-memory store — replace with Vercel Postgres/KV for production
const orders = new Map<string, Order>()

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'status'>): Order {
  const order: Order = {
    ...data,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  orders.set(order.id, order)
  return order
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id)
}

export function getAllOrders(): Order[] {
  return Array.from(orders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function updateStatus(id: string, status: OrderStatus): Order | null {
  const order = orders.get(id)
  if (!order) return null
  order.status = status
  orders.set(id, order)
  return order
}
