# Diagnostic: find which MovJ/MovL command format this firmware accepts
import socket, time

ROBOT_IP = "192.168.5.1"

# P1 Home - pose and joint from point.json
POSE  = (-186.246552, -231.564117, 357.991058, -179.293259, 7.269885, 178.68074)
JOINT = (-83.353271, 18.568611, -63.483124, -43.27755, 96.860619, 8.817215)

def send(s, cmd):
    s.sendall((cmd + "\n").encode())
    time.sleep(0.4)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "FAIL"
    print(f"  [{ok}] >> {cmd}")
    print(f"         << {resp}")
    return resp

def main():
    s = socket.socket()
    s.settimeout(8)
    s.connect((ROBOT_IP, 29999))
    print(f"Connected {ROBOT_IP}:29999\n")

    # Check current state
    send(s, "RobotMode()")
    send(s, "GetErrorID()")
    print()

    # --- Try different move formats ---

    # 1. Cartesian - basic
    send(s, f"MovJ({','.join(str(v) for v in POSE)})")

    # 2. Cartesian with Tool/User (from point.json: tool=1, user=0)
    send(s, f"MovJ({','.join(str(v) for v in POSE)},Tool=1,User=0)")

    # 3. Joint angles (JointMovJ)
    send(s, f"JointMovJ({','.join(str(v) for v in JOINT)})")

    # 4. Joint angles rounded
    jnt = tuple(round(v, 3) for v in JOINT)
    send(s, f"JointMovJ({','.join(str(v) for v in jnt)})")

    # 5. MovJoint (alternative name)
    send(s, f"MovJoint({','.join(str(v) for v in JOINT)})")

    # 6. Rounded Cartesian
    pse = tuple(round(v, 3) for v in POSE)
    send(s, f"MovJ({','.join(str(v) for v in pse)})")

    # 7. Ask robot what commands it supports
    send(s, "GetRobotType()")
    send(s, "GetVersion()")
    send(s, "DeviceVersion()")

    print("\nDone")
    s.close()

if __name__ == "__main__":
    main()
