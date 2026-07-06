// Edge Runtime: ESP8266 pushes weight readings here directly over HTTPS.
// Uses Upstash Redis (not a bare in-memory var) because Edge Function
// isolates don't reliably share module-level state across requests —
// confirmed empirically: repeated GETs right after a POST returned stale
// or empty data from different isolates.
import { Redis } from '@upstash/redis'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const KEY = 'scale:latest'

interface ScaleState {
  weight: number
  stable: boolean
  updatedAt: number
  cal: number
  lastAppliedId: number
}

const EMPTY: ScaleState = { weight: 0, stable: false, updatedAt: 0, cal: 0, lastAppliedId: 0 }

export async function GET() {
  const latest = (await redis.get<ScaleState>(KEY)) ?? EMPTY
  const age = Date.now() - latest.updatedAt
  // ESP heartbeat moi 10s toi da khi khong doi gi — cho bien do de tranh
  // bao "stale" gia giua 2 lan heartbeat binh thuong
  return Response.json({ ...latest, stale: latest.updatedAt === 0 || age > 15000 })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as
    { weight?: number; stable?: boolean; cal?: number; lastAppliedId?: number } | null
  if (!body || typeof body.weight !== 'number') {
    return Response.json({ error: 'bad body' }, { status: 400 })
  }
  const prev = (await redis.get<ScaleState>(KEY)) ?? EMPTY
  const next: ScaleState = {
    weight: body.weight,
    stable: !!body.stable,
    updatedAt: Date.now(),
    cal: typeof body.cal === 'number' ? body.cal : prev.cal,
    lastAppliedId: typeof body.lastAppliedId === 'number' ? body.lastAppliedId : prev.lastAppliedId,
  }
  await redis.set(KEY, next)
  return Response.json({ ok: true })
}
