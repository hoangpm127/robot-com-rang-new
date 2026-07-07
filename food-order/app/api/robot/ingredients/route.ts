export const dynamic = 'force-dynamic'

const BASE = process.env.ROBOT_SERVER_URL ?? 'http://localhost:5000'

export async function GET() {
  try {
    const r = await fetch(`${BASE}/api/ingredients`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    const data = await r.json()
    return Response.json(data, { status: r.status })
  } catch (e) {
    return Response.json({ error: 'Robot server unreachable' }, { status: 503 })
  }
}
