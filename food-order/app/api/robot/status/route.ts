export const dynamic = 'force-dynamic'

const BASE = process.env.ROBOT_SERVER_URL ?? 'http://localhost:5000'

export async function GET() {
  try {
    const r = await fetch(`${BASE}/api/dispense/status`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    const data = await r.json()
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: 'Robot server unreachable', running: false, status: 'error' }, { status: 503 })
  }
}
