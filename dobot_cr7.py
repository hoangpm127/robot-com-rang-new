# Dobot CR7 TCP Controller
# All commands go through port 29999 (confirmed by test_connection.py)
# Robot IP: 192.168.5.1

import socket
import time

ROBOT_IP = "192.168.5.1"
DASHBOARD_PORT = 29999
TIMEOUT = 10.0

# Teach points from point.json (pose: X,Y,Z,Rx,Ry,Rz in mm/deg)
POINTS = {
    "P1": [-186.246552, -231.564117, 357.991058, -179.293259,   7.269885,  178.68074],   # Home
    "P2": [-305.476135, -527.413147,  14.133228, -176.713196,  -4.635796,  169.193802],   # xuong_gap
    "P3": [-305.476135, -527.854492, -28.892105, -176.713196,  -4.635796,  169.193802],   # gap
    "P4": [ 263.15686,  -305.2742,   251.383377, -177.925415,   5.798448, -113.771545],   # tha
}


class DobotCR:
    def __init__(self, ip: str = ROBOT_IP, port: int = DASHBOARD_PORT):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(TIMEOUT)
        self.sock.connect((ip, port))
        print(f"[OK] Connected {ip}:{port}")

    def send(self, cmd: str) -> str:
        self.sock.sendall((cmd + "\n").encode())
        time.sleep(0.1)
        resp = self.sock.recv(4096).decode().strip()
        print(f"  >> {cmd}")
        print(f"  << {resp}")
        return resp

    def error_id(self, resp: str) -> int:
        try:
            return int(resp.split(",")[0])
        except Exception:
            return -1

    # --- Robot control ---

    def enable(self):
        return self.send("EnableRobot()")

    def disable(self):
        return self.send("DisableRobot()")

    def clear_error(self):
        return self.send("ClearError()")

    def speed_factor(self, ratio: int):
        return self.send(f"SpeedFactor({ratio})")

    def robot_mode(self) -> int:
        resp = self.send("RobotMode()")
        try:
            return int(resp.split("{")[1].split("}")[0])
        except Exception:
            return -1

    def sync(self):
        """Wait for all queued motions to complete."""
        return self.send("Sync()")

    # --- Motion ---

    def MovJ(self, x, y, z, rx, ry, rz, speed: int = None):
        return self.send(f"MovJ({x},{y},{z},{rx},{ry},{rz})")

    def MovL(self, x, y, z, rx, ry, rz, speed: int = None):
        return self.send(f"MovL({x},{y},{z},{rx},{ry},{rz})")

    # --- Digital I/O ---

    def DO(self, index: int, status: int):
        return self.send(f"DO({index},{status})")

    def close(self):
        self.sock.close()


# --- Main program (converted from src0.lua) ---

def run_program(robot_ip: str = ROBOT_IP):
    print(f"\n=== Dobot CR7 - {robot_ip} ===\n")
    robot = DobotCR(robot_ip)

    try:
        mode = robot.robot_mode()
        print(f"\n  Robot mode: {mode} (5=ENABLE, 9=ERROR)")

        if mode == 9:
            print("  Clearing error...")
            robot.clear_error()
            time.sleep(1.0)

        if mode != 5:
            print("  Enabling robot...")
            robot.enable()
            time.sleep(2.0)

        robot.speed_factor(30)  # safe speed for testing

        print("\n--- Pick & Place program ---\n")

        # MovJ(P1) - Home
        robot.MovJ(*POINTS["P1"], speed=40)
        robot.sync()

        # MovL(P2) - approach pick
        robot.MovL(*POINTS["P2"], speed=25)
        robot.sync()

        # MovL(P3) - pick position
        robot.MovL(*POINTS["P3"], speed=15)
        robot.sync()

        # DO(1,1) - gripper/vacuum ON
        robot.DO(1, 1)

        # Wait(5000)
        print("  Waiting 5s...")
        time.sleep(5.0)

        # DO(2,1)
        robot.DO(2, 1)

        # DO(1,0)
        robot.DO(1, 0)

        # MovL(P2) - retract
        robot.MovL(*POINTS["P2"], speed=20)
        robot.sync()

        # MovL(P4) - place position
        robot.MovL(*POINTS["P4"], speed=25)
        robot.sync()

        # DO(2,0) - release
        robot.DO(2, 0)

        print("\n--- Program complete ---")

    except KeyboardInterrupt:
        print("\n[!] Stopped by user")
        robot.send("StopMove()")

    except Exception as e:
        print(f"\n[ERROR] {e}")

    finally:
        robot.close()
        print("Disconnected.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", default=ROBOT_IP)
    args = parser.parse_args()
    run_program(args.ip)
