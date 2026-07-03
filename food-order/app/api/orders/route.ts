import { NextRequest, NextResponse } from 'next/server'
import { createOrder, getAllOrders } from '@/lib/store'

export async function GET() {
  return NextResponse.json(getAllOrders())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customerName, customerPhone, tableNumber, note, items, total } = body

  if (!customerName || !customerPhone || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const order = createOrder({ customerName, customerPhone, tableNumber: tableNumber ?? '', note: note ?? '', items, total })

  // Webhook — set WEBHOOK_URL in .env to receive new order events
  if (process.env.WEBHOOK_URL) {
    fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'order.created', order }),
    }).catch(() => {})
  }

  return NextResponse.json(order, { status: 201 })
}
