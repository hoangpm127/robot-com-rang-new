# Try completely different MovJ formats + discover valid motion commands
import socket, time

ROBOT_IP = "192.168.5.1"
CX, CY, CZ, CRX, CRY, CRZ = 317.1823, -177.9383, 508.2535, -178.822, 5.621, -106.7653

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

# Try Lua table format
send(s, f"MovJ({{X={CX},Y={CY},Z={CZ},Rx={CRX},Ry={CRY},Rz={CRZ}}})")
send(s, f"MovJ({{x={CX},y={CY},z={CZ},rx={CRX},ry={CRY},rz={CRZ}}})")

# Try different command names
for name in ["Move", "MoveJ", "MoveTo", "GotoPoint", "PointMove", "PTPCmd", "PTP"]:
    send(s, f"{name}({CX},{CY},{CZ},{CRX},{CRY},{CRZ})")

# Try with type flag (some robots use type 1=joint 2=linear)
send(s, f"MovJ(1,{CX},{CY},{CZ},{CRX},{CRY},{CRZ})")
send(s, f"MovJ(0,{CX},{CY},{CZ},{CRX},{CRY},{CRZ})")

# Maybe there's a "queue" approach specific to this firmware
send(s, "GetQueuedCmdCurrentIndex()")
send(s, "GetQueuedCmdLeftSpace()")

s.close()
