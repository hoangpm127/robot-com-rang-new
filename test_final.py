# Final comprehensive motion command sweep + FTP probe
import socket, time, ftplib

ROBOT_IP = "192.168.5.1"
CX, CY, CZ, CRX, CRY, CRZ = 317.1823, -177.9383, 508.2535, -178.822, 5.621, -106.7653

def send(s, cmd, wait=0.5):
    s.sendall((cmd + "\n").encode())
    time.sleep(wait)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}  >>  {resp}")
    return resp

# ── FTP probe ─────────────────────────────────────────────
print("=== FTP probe ===")
try:
    ftp = ftplib.FTP()
    ftp.connect(ROBOT_IP, 21, timeout=5)
    banner = ftp.getwelcome()
    print(f"  Banner: {banner}")
    for user, pw in [("root","888888"), ("dobot","888888"), ("anonymous",""), ("ftp","")]:
        try:
            ftp.login(user, pw)
            print(f"  [OK] FTP login as {user}")
            ftp.retrlines("LIST", print)
            break
        except ftplib.error_perm as e:
            print(f"  [X] {user}: {e}")
    ftp.quit()
except Exception as e:
    print(f"  FTP error: {e}")

# ── TCP motion sweep ───────────────────────────────────────
print("\n=== TCP motion sweep ===")
s = socket.socket(); s.settimeout(8); s.connect((ROBOT_IP, 29999))

# Maybe need "MotionEnable" or similar before MovJ
for cmd in ["MotionEnable(1)", "MotionEnable()", "EnableMotion()", "TCPMotion(1)"]:
    send(s, cmd)

# JSON format
import json
payload = json.dumps({"x":CX,"y":CY,"z":CZ,"rx":CRX,"ry":CRY,"rz":CRZ})
send(s, f"MovJ({payload})")

# Maybe needs robot serial number or session token
send(s, "GetSerial()")
send(s, "GetSN()")
send(s, "Login()")
send(s, "Auth()")

# Try JogP (jog in Cartesian pose) - different from MoveJog
for cmd in ["JogP(X+)", "JogCoord(X+)", "MoveJog(X+)", "MoveJog(Y+)"]:
    send(s, cmd)
    time.sleep(0.3)
    send(s, "MoveJog()")  # stop

# Check if there's a motion lock
send(s, "GetMotionLock()")
send(s, "MotionLock()")
send(s, "GetControlMode()")

s.close()
