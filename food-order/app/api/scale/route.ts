// Edge Runtime: ESP8266 pushes weight readings here directly over HTTPS.
// Uses Upstash Redis (not a bare in-memory var) because Edge Function
// isolates don't reliably share module-level state across requests —
// confirmed empirically: repeated GETs right after a POST returned stale
// or empty data from different isolates.
//
// Uses a Redis HASH (hset/hgetall) instead of a JSON blob (get/set) so a
// write only costs one round trip instead of a get-then-set pair.
import { Redis } from '@upstash/redis'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const KEY = 'scale:latest'

export async function GET() {
  const h = await redis.hgetall<Record<string, string | number>>(KEY)
  const weight = Number(h?.weight ?? 0)
  const stable = String(h?.stable) === 'true'
  const updatedAt = Number(h?.updatedAt ?? 0)
  const cal = Number(h?.cal ?? 0)
  const lastAppliedId = Number(h?.lastAppliedId ?? 0)
  const age = Date.now() - updatedAt
  // ESP heartbeat moi 10s toi da khi khong doi gi — cho bien do de tranh
  // bao "stale" gia giua 2 lan heartbeat binh thuong
  return Response.json({
    weight, stable, updatedAt, cal, lastAppliedId,
    stale: updatedAt === 0 || age > 15000,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as
    { weight?: number; stable?: boolean; cal?: number; lastAppliedId?: number } | null
  if (!body || typeof body.weight !== 'number') {
    return Response.json({ error: 'bad body' }, { status: 400 })
  }
  const fields: Record<string, string | number> = {
    weight: body.weight,
    stable: String(!!body.stable),
    updatedAt: Date.now(),
  }
  if (typeof body.cal === 'number') fields.cal = body.cal
  if (typeof body.lastAppliedId === 'number') fields.lastAppliedId = body.lastAppliedId
  await redis.hset(KEY, fields)
  return Response.json({ ok: true })
}
