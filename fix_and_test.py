# Fix robot error state then retry MovJ
import socket, time

ROBOT_IP = "192.168.5.1"
POSE_P1 = (-186.246552, -231.564117, 357.991058, -179.293259, 7.269885, 178.68074)

def send(s, cmd, wait=0.8):
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

print("=== Current state ===")
send(s, "RobotMode()")
send(s, "GetErrorID()")

print("\n=== Fix error state ===")
send(s, "ClearError()")
time.sleep(1)
send(s, "EnableRobot()", wait=3)
time.sleep(2)
send(s, "RobotMode()")
send(s, "GetErrorID()")

print("\n=== Retry MovJ ===")
p = POSE_P1
send(s, f"MovJ({p[0]},{p[1]},{p[2]},{p[3]},{p[4]},{p[5]})")
send(s, "Sync()")

s.close()
