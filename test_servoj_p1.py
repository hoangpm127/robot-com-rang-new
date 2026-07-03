"""Move to P1 using single ServoJ, wait, then verify position"""
import socket, time

ROBOT_IP = "192.168.5.1"

# P1 Home joints from point.json
J_P1 = (-83.353271, 18.568611, -63.483124, -43.27755, 96.860619, 8.817215)

def send(s, cmd, wait=0.5):
    s.sendall((cmd + "\n").encode())
    time.sleep(wait)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")
    return resp

s = socket.socket(); s.settimeout(15); s.connect((ROBOT_IP, 29999))

send(s, "ClearError()")
time.sleep(0.5)
send(s, "EnableRobot()", wait=2)
send(s, "RobotMode()")
send(s, "GetAngle()")
send(s, "SpeedFactor(20)")

print("\n=== Sending ServoJ to P1 (Home) ===")
print("    !!! Robot will move !!!")
time.sleep(2)

cmd = "ServoJ({:.4f},{:.4f},{:.4f},{:.4f},{:.4f},{:.4f})".format(*J_P1)
send(s, cmd, wait=0.5)

print("  Waiting for motion to complete (10s)...")
for i in range(10):
    time.sleep(1)
    try:
        s.sendall(("GetAngle()\n").encode())
        time.sleep(0.3)
        resp = s.recv(4096).decode().strip()
        print(f"  [{i+1}s] GetAngle: {resp}")
        if resp.startswith("0,"):
            print("  Motion complete!")
            break
    except:
        pass

send(s, "GetAngle()")
send(s, "GetPose()")
send(s, "RobotMode()")

s.close()
