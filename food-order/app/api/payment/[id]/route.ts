export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const COOK_MS = 60_000

const confirmed = new Map<string, number>() // orderId → confirmedAt timestamp
let robotFreeAt = 0                          // when all queued orders finish

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ts = confirmed.get(id)
  return Response.json({ confirmed: ts != null, confirmedAt: ts ?? null })
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const now = Date.now()
  // Queue this order after whatever is already cooking
  const startAt = Math.max(now, robotFreeAt)
  robotFreeAt = startAt + COOK_MS
  const waitMs = startAt - now // 0 if robot is free now, >0 if there's a queue
  confirmed.set(id, now)
  return Response.json({ ok: true, waitMs })
}
