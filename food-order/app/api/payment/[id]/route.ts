// Edge Runtime: V8 isolate reused aggressively — global Map persists across requests
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const confirmed = new Map<string, number>() // orderId → timestamp

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ts = confirmed.get(id)
  return Response.json({ confirmed: ts != null, confirmedAt: ts ?? null })
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  confirmed.set(id, Date.now())
  return Response.json({ ok: true })
}
