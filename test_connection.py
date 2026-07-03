# Test TCP communication with Dobot CR7
# Robot IP: 192.168.5.1

import socket
import time

ROBOT_IP = "192.168.5.1"
DASHBOARD_PORT = 29999
MOVE_PORT = 30003
FEED_PORT = 30004
TIMEOUT = 5.0


def test_port(ip, port, label):
    print(f"\n[TEST] {label} -> {ip}:{port}")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(TIMEOUT)
        s.connect((ip, port))
        print(f"  [OK] Connected")

        cmd = "GetErrorID()\n"
        s.sendall(cmd.encode())
        time.sleep(0.5)

        try:
            resp = s.recv(1024).decode().strip()
            print(f"  >> {cmd.strip()}")
            print(f"  << {resp}")
        except socket.timeout:
            print(f"  [!] No response (timeout)")

        s.close()
        return True

    except ConnectionRefusedError:
        print(f"  [X] Connection refused - port not open")
        return False
    except socket.timeout:
        print(f"  [X] Timeout - check IP/network")
        return False
    except Exception as e:
        print(f"  [X] Error: {e}")
        return False


def test_dashboard_commands(ip):
    print(f"\n[TEST] Sending commands via Dashboard port 29999")
    cmds = [
        "GetErrorID()",
        "RobotMode()",
        "GetDO(1)",
    ]
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(TIMEOUT)
        s.connect((ip, DASHBOARD_PORT))
        print(f"  [OK] Dashboard connected\n")

        for cmd in cmds:
            s.sendall((cmd + "\n").encode())
            time.sleep(0.3)
            try:
                resp = s.recv(1024).decode().strip()
                print(f"  >> {cmd}")
                print(f"  << {resp}\n")
            except socket.timeout:
                print(f"  >> {cmd}")
                print(f"  << (timeout)\n")

        s.close()

    except Exception as e:
        print(f"  [X] Error: {e}")


def main():
    print("=" * 50)
    print(f"  Dobot CR7 - TCP Connection Test")
    print(f"  Robot IP : {ROBOT_IP}")
    print(f"  PC IP    : 192.168.5.10")
    print("=" * 50)

    ok_dashboard = test_port(ROBOT_IP, DASHBOARD_PORT, "Dashboard port")
    ok_move      = test_port(ROBOT_IP, MOVE_PORT,      "Move port    ")
    ok_feed      = test_port(ROBOT_IP, FEED_PORT,      "Feedback port")

    print("\n" + "=" * 50)
    print("  Results:")
    print(f"  Dashboard 29999 : {'OK' if ok_dashboard else 'FAIL'}")
    print(f"  Move      30003 : {'OK' if ok_move else 'FAIL'}")
    print(f"  Feedback  30004 : {'OK' if ok_feed else 'FAIL'}")
    print("=" * 50)

    if ok_dashboard:
        test_dashboard_commands(ROBOT_IP)


if __name__ == "__main__":
    main()
