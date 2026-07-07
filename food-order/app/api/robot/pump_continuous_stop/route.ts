export const dynamic = 'force-dynamic'

const BASE = process.env.ROBOT_SERVER_URL ?? 'http://localhost:5000'

export async function POST() {
  try {
    const r = await fetch(`${BASE}/api/pump/continuous/stop`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    })
    const data = await r.json()
    return Response.json(data, { status: r.status })
  } catch (e) {
    return Response.json({ error: 'Robot server unreachable' }, { status: 503 })
  }
}
