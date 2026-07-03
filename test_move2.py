# Further diagnostics - query commands + MovJ variants
import socket, time

ROBOT_IP = "192.168.5.1"
POSE_P1  = (-186.246552, -231.564117, 357.991058, -179.293259, 7.269885, 178.68074)

def send(s, cmd):
    s.sendall((cmd + "\n").encode())
    time.sleep(0.4)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")
    return resp

s = socket.socket()
s.settimeout(8)
s.connect((ROBOT_IP, 29999))

# Query current robot state
send(s, "GetPose()")
send(s, "GetAngle()")
send(s, "RobotMode()")

# Try EnableRobot explicitly then MovJ
send(s, "ClearError()")
time.sleep(0.5)
send(s, "EnableRobot()")
time.sleep(2)
send(s, "RobotMode()")

p = POSE_P1
# Try positional User=0, Tool=1 (matching point.json)
send(s, f"MovJ({p[0]},{p[1]},{p[2]},{p[3]},{p[4]},{p[5]},0,1)")
# Try User=0, Tool=0
send(s, f"MovJ({p[0]},{p[1]},{p[2]},{p[3]},{p[4]},{p[5]},0,0)")
# Try with CP param
send(s, f"MovJ({p[0]},{p[1]},{p[2]},{p[3]},{p[4]},{p[5]},CP=0)")
# Try Lua-style via RunScript if exists
send(s, f"RunScript(MovJ({p[0]},{p[1]},{p[2]},{p[3]},{p[4]},{p[5]}))")

s.close()
