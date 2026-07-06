// Edge Runtime: ESP8266 pushes weight readings here directly over HTTPS.
// server.py polls this instead of reaching the ESP over LAN, so the ESP
// and the robot PC no longer need to share a WiFi network or use ngrok.
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

let latest = { weight: 0, stable: false, updatedAt: 0, cal: 0, lastAppliedId: 0 }

export async function GET() {
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
  latest = {
    weight: body.weight,
    stable: !!body.stable,
    updatedAt: Date.now(),
    cal: typeof body.cal === 'number' ? body.cal : latest.cal,
    lastAppliedId: typeof body.lastAppliedId === 'number' ? body.lastAppliedId : latest.lastAppliedId,
  }
  return Response.json({ ok: true })
}
