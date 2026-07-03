# More MovJ variants now robot is confirmed movable
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

# Get current position to use as target
r = send(s, "GetPose()")
nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
cx, cy, cz, crx, cry, crz = [round(float(v), 4) for v in nums]

send(s, "RobotMode()")
send(s, "AccJ(50)")
send(s, "AccL(50)")
send(s, "SpeedFactor(30)")

# Try SetTool / SetUser
send(s, "SetTool(0)")
send(s, "SetUser(0)")
send(s, "Tool(0)")
send(s, "User(0)")

print(f"\n  Trying MovJ to current pos: {cx},{cy},{cz},{crx},{cry},{crz}")

# MovJ with AccJ embedded
send(s, f"MovJ({cx},{cy},{cz},{crx},{cry},{crz},AccJ=50)")

# Try with just 2 decimal places
x2,y2,z2,rx2,ry2,rz2 = round(cx,2),round(cy,2),round(cz,2),round(crx,2),round(cry,2),round(crz,2)
send(s, f"MovJ({x2},{y2},{z2},{rx2},{ry2},{rz2})")

# Try ArmOrientation param
send(s, f"MovJ({cx},{cy},{cz},{crx},{cry},{crz},ArmOrientation=0)")

# Try with vel= acc= format
send(s, f"MovJ({cx},{cy},{cz},{crx},{cry},{crz},vel=30,acc=50)")

# Check if SetTool / SetUser responded OK
send(s, "GetPose()")

s.close()
