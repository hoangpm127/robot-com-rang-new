// Edge Runtime: browser posts a calibration command here; ESP polls GET
// to pick it up (ESP can't receive inbound connections, so it must poll —
// same reasoning as why the robot control side needs ngrok/polling).
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

type Command =
  | { id: number; action: 'tare' }
  | { id: number; action: 'cal_adjust'; delta: number }
  | { id: number; action: 'calibrate'; knownWeight: number }

let pending: Command | null = null
let nextId = 1

export async function GET() {
  // ESP claims the command by reading it once; cleared immediately so it
  // doesn't get re-applied on the next poll.
  const cmd = pending
  pending = null
  return Response.json({ command: cmd })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as
    { action?: string; delta?: number; knownWeight?: number } | null
  if (!body || !body.action) {
    return Response.json({ error: 'bad body' }, { status: 400 })
  }

  const id = nextId++
  if (body.action === 'tare') {
    pending = { id, action: 'tare' }
  } else if (body.action === 'cal_adjust' && typeof body.delta === 'number') {
    pending = { id, action: 'cal_adjust', delta: body.delta }
  } else if (body.action === 'calibrate' && typeof body.knownWeight === 'number' && body.knownWeight > 0) {
    pending = { id, action: 'calibrate', knownWeight: body.knownWeight }
  } else {
    return Response.json({ error: 'invalid action/params' }, { status: 400 })
  }

  return Response.json({ ok: true, id })
}
