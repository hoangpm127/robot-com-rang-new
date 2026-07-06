"""
Dobot CR7 Remote Control Server + Dosing Controller
Run: py server.py

Weight comes from ESP8266 -> Vercel (/api/scale) -> polled here, no LAN/ngrok
needed for that part. ngrok is only needed so the deployed website can reach
this PC to trigger /api/dispense, /api/run, /api/cook_order etc.
"""
import threading, time, socket, re, random
import requests as req
from flask import Flask, jsonify, request, render_template_string

# ── Robot connection ─────────────────────────────────────────
ROBOT_IP   = "192.168.5.1"
SERVER_PORT = 5000

# ── Load cell (via deployed web server) ───────────────────────
# ESP8266 pushes weight straight to this Vercel endpoint over HTTPS;
# we poll the same endpoint here instead of hitting the ESP over LAN.
# No ngrok needed for this path — ESP and this PC just need Internet.
VERCEL_SCALE_URL = "https://robot-com-rang-new.vercel.app/api/scale"

# ── Dosing pump config ───────────────────────────────────────
PUMP_DO_PORT      = 1      # Output1 — DO port wired to dosing pump/nguyen lieu
PUMP_INITIAL_SEC  = 1.0    # First pump burst duration
PUMP_CORRECT_SEC  = 0.2    # Correction burst duration
SETTLE_TIME       = 1.2    # Seconds to wait for dynamic weight to stabilise
MAX_CORRECTIONS   = 8      # Max correction bursts before giving up
VALID_TARGETS     = {100, 200, 300}

# Set True until real robot is connected → weight/pump are simulated
SIMULATE_ROBOT = False

# Joint angles from point.json
JOINTS = {
    "P1": (-83.353271, 18.568611, -63.483124, -43.27755,  96.860619, 8.817215),
    "P2": (-91.84021,  -23.438988, -93.522491, 29.492798,  84.309769, 8.815842),
    "P3": (-91.823776, -26.856602, -97.371941, 36.764336,  84.32135,  8.768964),
    "P4": (-15.731392,  11.357117, -83.433609, -14.995651, 95.032425, 8.783226),
}

ROBOT_MODES = {1:"INIT",2:"BRAKE",4:"DISABLED",5:"ENABLE",6:"BACKDRIVE",
               7:"RUNNING",8:"RECORDING",9:"ERROR",10:"PAUSE",11:"JOG"}

# ── Robot state ───────────────────────────────────────────────
state = {
    "connected": False,
    "mode": 0,
    "joints": [0]*6,
    "pose": [0]*6,
    "busy": False,
    "log": [],
    "error": None,
}
robot_lock = threading.Lock()
sock = None

# ── Simulation weight ─────────────────────────────────────────
# Tracks the simulated dispensed weight when SIMULATE_ROBOT=True
_sim_weight = 0.0
_sim_lock   = threading.Lock()

# ── Cached weight from ESP8266 (updated by background poller) ─
_weight_cache = {"weight": 0.0, "stable": False, "t": 0.0}

# ── Dispense state ────────────────────────────────────────────
dispense_lock  = threading.Lock()
dispense_state = {
    "running":  False,
    "status":   "idle",     # idle | pumping | settling | measuring | done | error
    "target":   0,
    "weight":   0.0,
    "attempts": 0,
    "log":      [],
    "result":   None,       # ok | underweight | esp_error | exception
}

# ─────────────────────────────────────────────────────────────
# Logging helpers
# ─────────────────────────────────────────────────────────────

def log(msg):
    state["log"].insert(0, f"[{time.strftime('%H:%M:%S')}] {msg}")
    state["log"] = state["log"][:30]
    print(msg)

def _dlog(msg):
    """Log into dispense_state log (and main log)."""
    log(msg)
    with dispense_lock:
        dispense_state["log"].insert(0, f"[{time.strftime('%H:%M:%S')}] {msg}")
        dispense_state["log"] = dispense_state["log"][:20]

# ─────────────────────────────────────────────────────────────
# Robot connection
# ─────────────────────────────────────────────────────────────

def send_cmd(cmd, wait=0.4):
    global sock
    try:
        sock.sendall((cmd + "\n").encode())
        time.sleep(wait)
        resp = sock.recv(4096).decode().strip()
        return resp
    except OSError:
        state["connected"] = False
        if _reconnect():
            try:
                sock.sendall((cmd + "\n").encode())
                time.sleep(wait)
                return sock.recv(4096).decode().strip()
            except Exception as e2:
                return f"ERR:{e2}"
        return "ERR:disconnected"
    except Exception as e:
        return f"ERR:{e}"

def _reconnect():
    global sock
    log("Connection lost, reconnecting...")
    try: sock.close()
    except: pass
    for attempt in range(5):
        time.sleep(3)
        try:
            sock = socket.socket()
            sock.settimeout(10)
            sock.connect((ROBOT_IP, 29999))
            time.sleep(0.5)
            try:
                banner = sock.recv(4096).decode(errors="replace").strip()
                if "occupied" in banner.lower():
                    log(f"Robot busy, retry {attempt+1}/5...")
                    sock.close()
                    continue
            except socket.timeout:
                pass
            state["connected"] = True
            state["error"] = None
            log("Reconnected OK")
            return True
        except Exception as e:
            log(f"Reconnect attempt {attempt+1} failed: {e}")
    state["connected"] = False
    state["error"] = "Cannot reconnect"
    return False

def _keepalive_loop():
    while True:
        time.sleep(8)
        if state["connected"] and not state["busy"]:
            with robot_lock:
                try:
                    sock.sendall(b"RobotMode()\n")
                    time.sleep(0.2)
                    sock.recv(1024)
                except:
                    pass

def connect_robot():
    global sock
    try:
        sock = socket.socket()
        sock.settimeout(10)
        sock.connect((ROBOT_IP, 29999))
        state["connected"] = True
        log("Robot connected")
        refresh_state()
        threading.Thread(target=_keepalive_loop, daemon=True).start()
        return True
    except Exception as e:
        state["error"] = str(e)
        log(f"Connect failed: {e}")
        return False

def refresh_state():
    try:
        r = send_cmd("RobotMode()", 0.3)
        if r.startswith("0,"):
            state["mode"] = int(r.split("{")[1].split("}")[0])

        r = send_cmd("GetAngle()", 0.3)
        if r.startswith("0,"):
            nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
            if len(nums) == 6:
                state["joints"] = [round(float(v), 2) for v in nums]

        r = send_cmd("GetPose()", 0.3)
        if r.startswith("0,"):
            nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
            if len(nums) == 6:
                state["pose"] = [round(float(v), 2) for v in nums]
    except:
        pass

def get_current_joints():
    for attempt in range(3):
        if len(state["joints"]) == 6:
            return tuple(state["joints"])
        send_cmd("ClearError()", 0.3)
        time.sleep(0.5)
        r = send_cmd("GetAngle()", 0.4)
        if r.startswith("0,"):
            nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
            if len(nums) == 6:
                state["joints"] = [round(float(v), 2) for v in nums]
                return tuple(state["joints"])
        time.sleep(0.5)
    raise RuntimeError("Cannot read joint angles from robot")

def servoj_stream(target, duration=4.0):
    current = get_current_joints()
    steps = max(int(duration * 10), 5)
    log(f"Moving {steps} steps -> {[round(v,1) for v in target]}")
    for i in range(1, steps + 1):
        t = i / steps
        ts = t * t * (3 - 2 * t)
        pt = tuple(c + (g - c) * ts for c, g in zip(current, target))
        if len(pt) != 6:
            raise RuntimeError(f"Bad trajectory point length: {len(pt)}")
        cmd = "ServoJ({:.4f},{:.4f},{:.4f},{:.4f},{:.4f},{:.4f})\n".format(*pt)
        try:
            sock.sendall(cmd.encode())
        except OSError:
            if not _reconnect():
                raise RuntimeError("Lost connection during ServoJ stream")
            send_cmd("ClearError()", 0.3)
            send_cmd("EnableRobot()", 2.0)
            sock.sendall(cmd.encode())
        time.sleep(0.1)
    state["joints"] = list(target)
    time.sleep(0.8)

def run_program():
    with robot_lock:
        state["busy"] = True
        try:
            log("ClearError + Enable")
            send_cmd("ClearError()", 0.5)
            send_cmd("EnableRobot()", 2.5)
            send_cmd("SpeedFactor(20)", 0.3)

            log("-> P1 Home")
            servoj_stream(JOINTS["P1"], 5.0)

            log("-> P2 approach")
            servoj_stream(JOINTS["P2"], 4.0)

            log("-> P3 pick")
            servoj_stream(JOINTS["P3"], 2.0)

            log("DO(1,1) gripper ON")
            send_cmd("DO(1,1)", 0.3)
            time.sleep(5.0)

            send_cmd("DO(2,1)", 0.3)
            send_cmd("DO(1,0)", 0.3)

            log("-> P2 retract")
            servoj_stream(JOINTS["P2"], 2.0)

            log("-> P4 place")
            servoj_stream(JOINTS["P4"], 5.0)

            log("DO(2,0) release")
            send_cmd("DO(2,0)", 0.3)

            log("Program complete!")
        except Exception as e:
            log(f"ERROR: {e}")
            state["error"] = str(e)
        finally:
            state["busy"] = False
            refresh_state()

# ─────────────────────────────────────────────────────────────
# Dosing / weighing logic
# ─────────────────────────────────────────────────────────────

def _weight_poll_loop():
    """Background thread: keeps _weight_cache fresh at ~3 Hz by polling
    the Vercel /api/scale endpoint that the ESP8266 pushes weight into."""
    global _sim_weight
    while True:
        try:
            if SIMULATE_ROBOT:
                with _sim_lock:
                    w = _sim_weight + random.uniform(-0.5, 0.5)
                _weight_cache["weight"] = max(0.0, w)
                _weight_cache["stable"] = True
            else:
                r = req.get(VERCEL_SCALE_URL, timeout=3)
                d = r.json()
                _weight_cache["weight"] = float(d["weight"])
                _weight_cache["stable"] = bool(d.get("stable", False))
            _weight_cache["t"] = time.time()
        except:
            pass
        time.sleep(0.33)


def _robot_pump(duration_sec: float):
    """Fire pump for `duration_sec` seconds via robot DO port."""
    global _sim_weight
    prefix = "[SIM] " if SIMULATE_ROBOT else ""
    _dlog(f"{prefix}Pump ON {duration_sec:.1f}s")

    if SIMULATE_ROBOT:
        time.sleep(duration_sec)
        # ~90 g/s with realistic variance
        added = random.uniform(75, 110) * duration_sec
        with _sim_lock:
            _sim_weight += added
        _dlog(f"[SIM] Pump OFF (+{added:.0f}g sim)")
    else:
        with robot_lock:
            send_cmd(f"DO({PUMP_DO_PORT},1)", 0.1)
            time.sleep(duration_sec)
            send_cmd(f"DO({PUMP_DO_PORT},0)", 0.1)
        _dlog("Pump OFF")


def _read_weight() -> float | None:
    """Return current weight (cached). None if stale > 5 s."""
    age = time.time() - _weight_cache.get("t", 0)
    if age > 5:
        return None
    return _weight_cache["weight"]


def _dispense_loop(target: int):
    """
    Full dosing sequence (runs in daemon thread):
      1. Initial 1 s pump burst
      2. Wait SETTLE_TIME for weight to stabilise
      3. Read weight; if >= target → done
      4. Else fire 0.2 s correction burst, repeat from 2
      Max MAX_CORRECTIONS correction bursts before giving up.
    """
    global _sim_weight

    with dispense_lock:
        dispense_state.update({
            "running": True,
            "status":  "pumping",
            "target":  target,
            "weight":  0.0,
            "attempts": 0,
            "log":     [],
            "result":  None,
        })

    if SIMULATE_ROBOT:
        with _sim_lock:
            _sim_weight = 0.0   # reset each run in simulation

    try:
        _dlog(f"START target={target}g{' [SIM]' if SIMULATE_ROBOT else ''}")

        # Initial pump
        _robot_pump(PUMP_INITIAL_SEC)

        for attempt in range(MAX_CORRECTIONS + 1):
            with dispense_lock:
                dispense_state["status"] = "settling"
                dispense_state["attempts"] = attempt + 1

            _dlog(f"Settling {SETTLE_TIME}s... (attempt {attempt+1})")
            time.sleep(SETTLE_TIME)

            with dispense_lock:
                dispense_state["status"] = "measuring"

            weight = _read_weight()
            if weight is None:
                _dlog("ERROR: ESP8266 unreachable (weight cache stale)")
                with dispense_lock:
                    dispense_state.update({"running": False, "status": "error",
                                           "result": "esp_error"})
                return

            with dispense_lock:
                dispense_state["weight"] = weight
            _dlog(f"Weight: {weight:.0f}g / {target}g")

            if weight >= target:
                _dlog(f"OK {weight:.0f}g >= {target}g after {attempt+1} pump(s)")
                with dispense_lock:
                    dispense_state.update({"running": False, "status": "done", "result": "ok"})
                return

            if attempt >= MAX_CORRECTIONS:
                _dlog(f"MAX_CORRECTIONS reached: {weight:.0f}g < {target}g")
                with dispense_lock:
                    dispense_state.update({"running": False, "status": "done",
                                           "result": "underweight"})
                return

            deficit = target - weight
            _dlog(f"Need +{deficit:.0f}g → correction {PUMP_CORRECT_SEC}s")
            with dispense_lock:
                dispense_state["status"] = "pumping"
            _robot_pump(PUMP_CORRECT_SEC)

    except Exception as e:
        _dlog(f"EXCEPTION: {e}")
        with dispense_lock:
            dispense_state.update({"running": False, "status": "error", "result": str(e)})


# ─────────────────────────────────────────────────────────────
# Flask app
# ─────────────────────────────────────────────────────────────

app = Flask(__name__)

MOBILE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Dobot CR7</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
  .header { background: #1e293b; padding: 16px; text-align: center; border-bottom: 1px solid #334155; }
  .header h1 { font-size: 20px; color: #38bdf8; }
  .status-bar { padding: 12px 16px; background: #1e293b; margin: 8px; border-radius: 10px; }
  .status-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
  .badge { padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: bold; }
  .badge-ok { background: #166534; color: #4ade80; }
  .badge-err { background: #7f1d1d; color: #f87171; }
  .badge-busy { background: #1e3a5f; color: #60a5fa; }
  .badge-gray { background: #334155; color: #94a3b8; }
  .section { padding: 8px 16px; }
  .section h2 { font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .btn { width: 100%; padding: 16px; margin: 6px 0; border: none; border-radius: 12px;
         font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
  .btn:active { opacity: 0.7; }
  .btn-green { background: #16a34a; color: white; }
  .btn-blue { background: #2563eb; color: white; }
  .btn-red { background: #dc2626; color: white; }
  .btn-gray { background: #334155; color: #94a3b8; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .log-box { background: #0f172a; border: 1px solid #334155; border-radius: 10px;
             padding: 10px; height: 160px; overflow-y: auto; font-family: monospace; font-size: 11px; }
  .log-line { padding: 2px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #60a5fa;
             border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .joints { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.6; }
</style>
</head>
<body>
<div class="header">
  <h1>&#129302; Dobot CR7</h1>
  <div id="conn-status" style="font-size:12px;margin-top:4px;color:#94a3b8">connecting...</div>
</div>

<div class="status-bar" id="status-bar">
  <div class="status-row">
    <span>Robot Mode</span>
    <span id="mode-badge" class="badge badge-gray">--</span>
  </div>
  <div class="joints" id="joints-disp">Joints: --</div>
</div>

<div class="section">
  <h2>Program</h2>
  <button class="btn btn-green" id="btn-run" onclick="runProgram()">&#9654; Run Pick &amp; Place</button>
  <div id="busy-indicator" style="display:none;text-align:center;padding:8px;color:#60a5fa;font-size:13px">
    <span class="spinner"></span> Running...
  </div>
</div>

<div class="section">
  <h2>Move to Point</h2>
  <div class="grid2">
    <button class="btn btn-blue" onclick="moveTo('P1')">P1 Home</button>
    <button class="btn btn-blue" onclick="moveTo('P2')">P2 Approach</button>
    <button class="btn btn-blue" onclick="moveTo('P3')">P3 Pick</button>
    <button class="btn btn-blue" onclick="moveTo('P4')">P4 Place</button>
  </div>
</div>

<div class="section">
  <h2>Digital Output</h2>
  <div class="grid2">
    <button class="btn btn-gray" onclick="setDO(1,1)">DO1 ON</button>
    <button class="btn btn-gray" onclick="setDO(1,0)">DO1 OFF</button>
    <button class="btn btn-gray" onclick="setDO(2,1)">DO2 ON</button>
    <button class="btn btn-gray" onclick="setDO(2,0)">DO2 OFF</button>
  </div>
</div>

<div class="section">
  <h2>Control</h2>
  <button class="btn btn-red" onclick="stopRobot()">&#9632; STOP</button>
  <button class="btn btn-gray" onclick="enableRobot()" style="margin-top:6px">Enable Robot</button>
</div>

<div class="section">
  <h2>Log <button onclick="clearLog()" style="float:right;background:#334155;color:#94a3b8;border:none;border-radius:6px;padding:2px 10px;font-size:11px;cursor:pointer">Clear</button></h2>
  <div class="log-box" id="log-box"></div>
</div>

<script>
function post(url, data={}) {
  return fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)})
    .then(r=>r.json()).catch(e=>({error:e.toString()}));
}
function runProgram() {
  if(document.getElementById('btn-run').disabled) return;
  post('/api/run').then(r => addLog(r.message || r.error));
}
function moveTo(point) {
  post('/api/move', {point}).then(r => addLog(r.message || r.error));
}
function setDO(index, status) {
  post('/api/do', {index, status}).then(r => addLog(r.message || r.error));
}
function stopRobot() {
  post('/api/stop').then(r => addLog(r.message || r.error));
}
function enableRobot() {
  post('/api/enable').then(r => addLog(r.message || r.error));
}
function clearLog() {
  post('/api/clear_log').then(() => { document.getElementById('log-box').innerHTML = ''; });
}
function addLog(msg) {
  const box = document.getElementById('log-box');
  const div = document.createElement('div');
  div.className = 'log-line';
  div.textContent = new Date().toLocaleTimeString() + ' ' + msg;
  box.prepend(div);
}
const MODES  = {1:'INIT',4:'DISABLED',5:'ENABLE',7:'RUNNING',9:'ERROR',10:'PAUSE'};
const COLORS = {5:'badge-ok', 7:'badge-busy', 9:'badge-err'};
function updateStatus() {
  fetch('/api/status').then(r=>r.json()).then(d => {
    document.getElementById('conn-status').textContent = d.connected ? 'Connected 192.168.5.1' : 'Disconnected';
    const badge = document.getElementById('mode-badge');
    badge.textContent = MODES[d.mode] || ('Mode '+d.mode);
    badge.className   = 'badge ' + (COLORS[d.mode] || 'badge-gray');
    document.getElementById('btn-run').disabled = d.busy;
    document.getElementById('busy-indicator').style.display = d.busy ? 'block' : 'none';
    if(d.joints && d.joints.length===6)
      document.getElementById('joints-disp').textContent = 'J: ' + d.joints.map(v=>v.toFixed(1)).join('  ');
    if(d.log && d.log.length)
      document.getElementById('log-box').innerHTML = d.log.map(l=>`<div class="log-line">${l}</div>`).join('');
  }).catch(()=>{});
}
setInterval(updateStatus, 1000);
updateStatus();
</script>
</body>
</html>"""


@app.route("/")
def index():
    return render_template_string(MOBILE_HTML)

@app.route("/api/status")
def api_status():
    refresh_state()
    return jsonify({**state, "mode_name": ROBOT_MODES.get(state["mode"], "?")})

@app.route("/api/run", methods=["POST"])
def api_run():
    if state["busy"]:
        return jsonify({"status": "busy", "message": "Already running"})
    t = threading.Thread(target=run_program, daemon=True)
    t.start()
    return jsonify({"status": "ok", "message": "Program started"})

@app.route("/api/move", methods=["POST"])
def api_move():
    if state["busy"]:
        return jsonify({"status": "busy", "message": "Robot busy"})
    point = request.json.get("point", "P1")
    if point not in JOINTS:
        return jsonify({"status": "error", "message": f"Unknown point {point}"})
    def do_move():
        with robot_lock:
            state["busy"] = True
            try:
                send_cmd("ClearError()", 0.3)
                send_cmd("EnableRobot()", 2.0)
                send_cmd("SpeedFactor(20)", 0.3)
                log(f"Moving to {point}")
                servoj_stream(JOINTS[point], 4.0)
                log(f"Reached {point}")
            finally:
                state["busy"] = False
                refresh_state()
    threading.Thread(target=do_move, daemon=True).start()
    return jsonify({"status": "ok", "message": f"Moving to {point}"})

@app.route("/api/do", methods=["POST"])
def api_do():
    idx = request.json.get("index", 1)
    val = request.json.get("status", 0)
    resp = send_cmd(f"DO({idx},{val})", 0.3)
    ok = resp.startswith("0,")
    log(f"DO({idx},{val}) -> {'OK' if ok else resp}")
    return jsonify({"status": "ok" if ok else "error", "message": f"DO({idx},{val})", "response": resp})

@app.route("/api/stop", methods=["POST"])
def api_stop():
    send_cmd("MoveJog()", 0.3)
    log("STOP sent")
    return jsonify({"status": "ok", "message": "Stop sent"})

@app.route("/api/enable", methods=["POST"])
def api_enable():
    send_cmd("ClearError()", 0.5)
    resp = send_cmd("EnableRobot()", 2.5)
    log("EnableRobot")
    refresh_state()
    return jsonify({"status": "ok", "message": "Enabled", "response": resp})

@app.route("/api/clear_log", methods=["POST"])
def api_clear_log():
    state["log"] = []
    state["error"] = None
    return jsonify({"status": "ok", "message": "Log cleared"})

# ── Dosing API ────────────────────────────────────────────────

@app.route("/api/weight")
def api_weight():
    """Proxy: returns current weight from ESP8266 (or sim)."""
    age = time.time() - _weight_cache.get("t", 0)
    return jsonify({
        "weight":  _weight_cache["weight"],
        "stable":  _weight_cache["stable"],
        "sim":     SIMULATE_ROBOT,
        "stale":   age > 5,
    })

@app.route("/api/dispense", methods=["POST"])
def api_dispense():
    with dispense_lock:
        if dispense_state["running"]:
            return jsonify({"error": "Already dispensing"}), 409

    data   = request.get_json() or {}
    target = int(data.get("target", 100))
    if target not in VALID_TARGETS:
        return jsonify({"error": f"Target must be one of {sorted(VALID_TARGETS)}"}), 400

    threading.Thread(target=_dispense_loop, args=(target,), daemon=True).start()
    return jsonify({"started": True, "target": target, "sim": SIMULATE_ROBOT})

@app.route("/api/dispense/status")
def api_dispense_status():
    with dispense_lock:
        return jsonify(dict(dispense_state))


# ── Cook order (called by Vercel when payment confirmed) ───────

# Queue của các order cần nấu: list of dict {order_id, items, total}
_cook_queue: list[dict] = []
_cook_lock = threading.Lock()
_cook_status: dict = {"running": False, "current_order": None, "queue_len": 0, "log": []}

def _cook_log(msg):
    ts = time.strftime('%H:%M:%S')
    entry = f"[{ts}] {msg}"
    _cook_status["log"].insert(0, entry)
    _cook_status["log"] = _cook_status["log"][:30]
    log(msg)

def _cook_loop():
    """Worker thread: dequeues and cooks orders one by one."""
    while True:
        with _cook_lock:
            if not _cook_queue:
                _cook_status["running"] = False
                _cook_status["current_order"] = None
                _cook_status["queue_len"] = 0
                break
            order = _cook_queue.pop(0)
            _cook_status["running"] = True
            _cook_status["current_order"] = order["order_id"]
            _cook_status["queue_len"] = len(_cook_queue)

        _cook_log(f"START cooking order {order['order_id']}  items={order['item_count']}")

        if SIMULATE_ROBOT:
            # Simulation: just wait proportional to number of portions
            cook_secs = 60 * order["item_count"]
            _cook_log(f"[SIM] Cooking {cook_secs}s for {order['item_count']} portions")
            time.sleep(cook_secs)
            _cook_log(f"[SIM] DONE order {order['order_id']}")
        else:
            # Real robot: run the cooking program for each portion
            for i in range(order["item_count"]):
                _cook_log(f"Portion {i+1}/{order['item_count']}: running robot program")
                run_program()   # existing pick & place / cooking sequence
                _cook_log(f"Portion {i+1} done")

        _cook_log(f"COMPLETE order {order['order_id']}")


@app.route("/api/cook_order", methods=["POST"])
def api_cook_order():
    """
    Called by Vercel website when customer payment is confirmed.
    Body: { order_id, item_count, total, items[] }
    """
    data = request.get_json(silent=True) or {}
    order_id   = data.get("order_id", "unknown")
    item_count = int(data.get("item_count", 1))
    total      = data.get("total", 0)

    with _cook_lock:
        # Check for duplicate
        existing_ids = [o["order_id"] for o in _cook_queue]
        if order_id in existing_ids or _cook_status.get("current_order") == order_id:
            return jsonify({"ok": False, "error": "Order already queued"}), 409

        queue_pos = len(_cook_queue)
        _cook_queue.append({
            "order_id":   order_id,
            "item_count": item_count,
            "total":      total,
        })
        _cook_status["queue_len"] = len(_cook_queue)
        already_running = _cook_status["running"]

    _cook_log(f"QUEUED order {order_id}  pos={queue_pos}  portions={item_count}  total={total}")

    # Start worker thread only if not already running
    if not already_running:
        threading.Thread(target=_cook_loop, daemon=True).start()

    return jsonify({
        "ok":       True,
        "order_id": order_id,
        "queue_pos": queue_pos,      # 0 = cooking now, 1+ = waiting
        "sim":      SIMULATE_ROBOT,
    })


@app.route("/api/cook_status")
def api_cook_status():
    with _cook_lock:
        return jsonify({**_cook_status, "queue_len": len(_cook_queue)})


# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    # Start weight cache poller
    threading.Thread(target=_weight_poll_loop, daemon=True).start()
    print("Weight poller started")

    if SIMULATE_ROBOT:
        print("=" * 50)
        print("  SIMULATION MODE — robot + ESP8266 simulated")
        print("  Set SIMULATE_ROBOT = False for real hardware")
        print("=" * 50)
    else:
        print(f"Connecting to robot {ROBOT_IP}...")
        if not connect_robot():
            print("WARNING: Could not connect to robot. Server starting anyway.")

    print(f"Weight now sourced from {VERCEL_SCALE_URL} (no LAN/ngrok needed for this part)")

    try:
        from pyngrok import ngrok
        tunnel = ngrok.connect(SERVER_PORT, "http")
        print(f"\n{'='*50}")
        print(f"  ngrok URL: {tunnel.public_url}")
        print(f"  Only needed so Vercel can trigger /api/dispense, /api/cook_order etc.")
        print(f"  Set ROBOT_SERVER_URL={tunnel.public_url} in Vercel env")
        print(f"{'='*50}\n")
    except Exception as e:
        print(f"ngrok not available ({e}). Access at http://localhost:{SERVER_PORT}")

    app.run(host="0.0.0.0", port=SERVER_PORT, debug=False)
