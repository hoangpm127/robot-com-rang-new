# Test ports 30005, 30006 and try MovJ with joint angles
import socket, time

ROBOT_IP = "192.168.5.1"
JOINT_P1 = (-83.353271, 18.568611, -63.483124, -43.27755, 96.860619, 8.817215)
POSE_P1  = (-186.246552, -231.564117, 357.991058, -179.293259, 7.269885, 178.68074)

def probe_port(port, cmds):
    print(f"\n=== Port {port} ===")
    try:
        s = socket.socket()
        s.settimeout(3)
        s.connect((ROBOT_IP, port))
        print(f"  Connected")
        for cmd in cmds:
            try:
                s.sendall((cmd + "\n").encode())
                time.sleep(0.5)
                data = s.recv(4096)
                try:
                    resp = data.decode().strip()
                except:
                    resp = f"<binary {len(data)} bytes>"
                ok = "OK" if resp.startswith("0,") else "??"
                print(f"  [{ok}] >> {cmd}")
                print(f"         << {resp[:120]}")
            except Exception as e:
                print(f"  [ERR] {cmd}: {e}")
        s.close()
    except Exception as e:
        print(f"  Cannot connect: {e}")

cmds_29999 = [
    # Try MovJ with joint angles (not Cartesian)
    f"MovJ({','.join(str(v) for v in JOINT_P1)})",
    # Try with {braces} notation some docs show
    f"MovJ({{{','.join(str(v) for v in POSE_P1)}}})",
    # Try ServoJ / other names
    f"ServoJ({','.join(str(v) for v in JOINT_P1)},0,0,0)",
    f"MoveJ({','.join(str(v) for v in POSE_P1)})",
]

cmds_new_port = [
    f"MovJ({','.join(str(v) for v in POSE_P1)})",
    f"MovL({','.join(str(v) for v in POSE_P1)})",
    f"MovJ({','.join(str(v) for v in JOINT_P1)})",
    "GetErrorID()",
    "RobotMode()",
]

probe_port(29999, cmds_29999)
probe_port(30005, cmds_new_port)
probe_port(30006, cmds_new_port)
