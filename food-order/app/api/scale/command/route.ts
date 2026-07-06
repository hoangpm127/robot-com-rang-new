// Edge Runtime: browser posts a calibration command here; ESP polls GET
// to pick it up (ESP can't receive inbound connections, so it must poll —
// same reasoning as why the robot control side needs ngrok/polling).
// Backed by Upstash Redis, not an in-memory var — a bare module variable
// here caused the exact bug this endpoint exists to avoid: the ESP's poll
// and the browser's POST landed on different Edge isolates with separate
// memory, so commands were silently dropped or replayed from stale state.
import { Redis } from '@upstash/redis'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const PENDING_KEY = 'scale:pending_command'
const ID_KEY = 'scale:next_command_id'

type Command =
  | { id: number; action: 'tare' }
  | { id: number; action: 'cal_adjust'; delta: number }
  | { id: number; action: 'calibrate'; knownWeight: number }

export async function GET() {
  // Atomic read+delete so a command is claimed exactly once even if two
  // polls race each other.
  const cmd = await redis.getdel<Command>(PENDING_KEY)
  return Response.json({ command: cmd ?? null })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as
    { action?: string; delta?: number; knownWeight?: number } | null
  if (!body || !body.action) {
    return Response.json({ error: 'bad body' }, { status: 400 })
  }

  const id = await redis.incr(ID_KEY)

  let cmd: Command
  if (body.action === 'tare') {
    cmd = { id, action: 'tare' }
  } else if (body.action === 'cal_adjust' && typeof body.delta === 'number') {
    cmd = { id, action: 'cal_adjust', delta: body.delta }
  } else if (body.action === 'calibrate' && typeof body.knownWeight === 'number' && body.knownWeight > 0) {
    cmd = { id, action: 'calibrate', knownWeight: body.knownWeight }
  } else {
    return Response.json({ error: 'invalid action/params' }, { status: 400 })
  }

  await redis.set(PENDING_KEY, cmd)
  return Response.json({ ok: true, id })
}
