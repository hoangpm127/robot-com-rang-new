# Deep MovJ diagnostic
import socket, time, re

ROBOT_IP = "192.168.5.1"

def send(s, cmd, wait=0.5):
    s.sendall((cmd + "\n").encode())
    time.sleep(wait)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")
    return resp

s = socket.socket()
s.settimeout(10)
s.connect((ROBOT_IP, 29999))

# Get exact current position
r = send(s, "GetPose()")
nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
cx, cy, cz, crx, cry, crz = [float(v) for v in nums]
print(f"\n  Current pose: X={cx} Y={cy} Z={cz}")

# Try SpeedJ / AccJ first
send(s, "SpeedJ(50)")
send(s, "AccJ(50)")
send(s, "SpeedL(30)")
send(s, "AccL(30)")

print("\n--- MovJ to EXACT current position (should not move) ---")
send(s, f"MovJ({cx},{cy},{cz},{crx},{cry},{crz})")

print("\n--- MovL to EXACT current position ---")
send(s, f"MovL({cx},{cy},{cz},{crx},{cry},{crz})")

print("\n--- Try with explicit Tool=0 User=0 ---")
send(s, f"MovJ({cx},{cy},{cz},{crx},{cry},{crz},User=0,Tool=0)")

print("\n--- Check what other motion commands exist ---")
for cmd in ["MoveJog(J1+)", "Jog(J1+)", "JogJ(1,1)", "MoveJog(J1-,0)"]:
    send(s, cmd)

s.close()
