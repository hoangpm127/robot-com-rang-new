"""
ServoJ works! Use it to move robot to P1 (Home)
ServoJ(J1,J2,J3,J4,J5,J6) - joint angles in degrees
"""
import socket, time, re

ROBOT_IP = "192.168.5.1"

# P1 Home joint angles from point.json
J_P1 = (-83.353271, 18.568611, -63.483124, -43.27755, 96.860619, 8.817215)
J_P4 = (-15.731392, 11.357117, -83.433609, -14.995651, 95.032425, 8.783226)

def send(s, cmd, wait=0.5):
    s.sendall((cmd + "\n").encode())
    time.sleep(wait)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")
    return resp

def get_joints(s):
    r = send(s, "GetAngle()", wait=0.3)
    nums = re.findall(r"[-\d.]+", r.split("{")[1].split("}")[0])
    return [float(v) for v in nums]

def interp(start, end, t):
    """Linear interpolation, t in [0,1]"""
    return [s + (e - s) * t for s, e in zip(start, end)]

def servoJ_move(s, target_joints, steps=50, step_delay=0.1):
    """Move smoothly to target using ServoJ interpolation"""
    current = get_joints(s)
    print(f"  Current: {[round(v,2) for v in current]}")
    print(f"  Target:  {[round(v,2) for v in target_joints]}")

    for i in range(1, steps + 1):
        t = i / steps
        pos = interp(current, target_joints, t)
        cmd = "ServoJ({:.4f},{:.4f},{:.4f},{:.4f},{:.4f},{:.4f})".format(*pos)
        s.sendall((cmd + "\n").encode())
        time.sleep(step_delay)
        resp = s.recv(4096).decode().strip()
        if not resp.startswith("0,"):
            print(f"  [ERR at step {i}] {resp}")
            return False
        if i % 10 == 0:
            print(f"  Step {i}/{steps}: {resp}")
    return True

s = socket.socket(); s.settimeout(10); s.connect((ROBOT_IP, 29999))

print("=== State check ===")
send(s, "ClearError()")
time.sleep(0.5)
send(s, "EnableRobot()", wait=2)
send(s, "RobotMode()")
send(s, "GetAngle()")
send(s, "SpeedFactor(20)")

print("\n=== Test ServoJ to current position (no movement) ===")
j = get_joints(s)
resp = send(s, "ServoJ({:.4f},{:.4f},{:.4f},{:.4f},{:.4f},{:.4f})".format(*j))
time.sleep(0.5)
send(s, "GetAngle()")  # Check if still alive

print("\n=== Move to P1 (Home) via ServoJ ===")
print("  >>> Robot will move! Make sure area is clear <<<")
time.sleep(2)

ok = servoJ_move(s, J_P1, steps=80, step_delay=0.08)
if ok:
    print("\n  [OK] Reached P1!")
    send(s, "GetAngle()")
    send(s, "GetPose()")
else:
    print("\n  [FAIL] Motion stopped")
    send(s, "ClearError()")

s.close()
