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

s = socket.socket(); s.settimeout(10); s.connect((ROBOT_IP, 29999))

# Get current joints
r = send(s, "GetAngle()")
nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
j1,j2,j3,j4,j5,j6 = [float(v) for v in nums]
print(f"\n  Current joints: {j1},{j2},{j3},{j4},{j5},{j6}\n")

# Try ServoJ variants (recognized as command)
send(s, f"ServoJ({j1},{j2},{j3},{j4},{j5},{j6})")
send(s, f"ServoJ({j1},{j2},{j3},{j4},{j5},{j6},0.1)")
send(s, f"ServoJ({j1},{j2},{j3},{j4},{j5},{j6},0.1,50,500)")
send(s, f"ServoJ({j1},{j2},{j3},{j4},{j5},{j6},t=0.1)")

# Try "external control" / start motion commands
for cmd in ["StartExternalControl()", "ExternalControl(1)", "SetExternalMotion(1)",
            "SetTCPMotion(1)", "OpenMotion()", "StartMotion(1)",
            "MotionStart()", "TCPControl(1)"]:
    send(s, cmd)

# After trying external control, retry MovJ
r = send(s, "GetPose()")
nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
cx,cy,cz,crx,cry,crz = [float(v) for v in nums]
send(s, f"MovJ({cx},{cy},{cz},{crx},{cry},{crz})")

# Also check robot mode after these commands
send(s, "RobotMode()")
send(s, "GetErrorID()")

s.close()
