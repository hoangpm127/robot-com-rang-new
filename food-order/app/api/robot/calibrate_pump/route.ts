export const dynamic = 'force-dynamic'

const BASE = process.env.ROBOT_SERVER_URL ?? 'http://localhost:5000'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const r = await fetch(`${BASE}/api/calibrate_pump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const data = await r.json()
    return Response.json(data, { status: r.status })
  } catch (e) {
    return Response.json({ error: 'Robot server unreachable' }, { status: 503 })
  }
}
