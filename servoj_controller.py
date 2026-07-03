"""
Dobot CR7 motion via ServoJ streaming.
ServoJ requires continuous commands - we pre-interpolate and stream at ~10Hz.
"""
import socket, time, threading

ROBOT_IP = "192.168.5.1"

# Teach points - joint angles from point.json
JOINTS = {
    "P1": (-83.353271, 18.568611, -63.483124, -43.27755,  96.860619, 8.817215),
    "P2": (-91.84021,  -23.438988, -93.522491, 29.492798,  84.309769, 8.815842),
    "P3": (-91.823776, -26.856602, -97.371941, 36.764336,  84.32135,  8.768964),
    "P4": (-15.731392,  11.357117, -83.433609, -14.995651, 95.032425, 8.783226),
}

SPEED = 20  # SpeedFactor %
STEP_HZ = 10
STEP_DELAY = 1.0 / STEP_HZ  # 100ms per step


class DobotCR7:
    def __init__(self, ip=ROBOT_IP):
        self.s = socket.socket()
        self.s.settimeout(10)
        self.s.connect((ip, 29999))
        self._lock = threading.Lock()
        self._recv_thread = threading.Thread(target=self._drain, daemon=True)
        self._recv_thread.start()
        self._last_resp = ""
        self._current_joints = None

    def _drain(self):
        """Background thread to drain socket responses"""
        self.s.settimeout(0.1)
        while True:
            try:
                data = self.s.recv(4096).decode(errors="replace").strip()
                if data:
                    self._last_resp = data
            except socket.timeout:
                pass
            except:
                break

    def send(self, cmd, wait=0.5):
        with self._lock:
            self.s.sendall((cmd + "\n").encode())
        time.sleep(wait)
        resp = self._last_resp
        ok = "OK" if resp.startswith("0,") else "--"
        print(f"  [{ok}] {cmd}  <<  {resp}")
        return resp

    def enable(self):
        self.send("ClearError()", wait=0.5)
        self.send("EnableRobot()", wait=2.5)
        self.send("SpeedFactor({})".format(SPEED), wait=0.3)

    def get_joints(self):
        self.send("GetAngle()", wait=0.5)
        resp = self._last_resp
        try:
            nums = resp.split("{")[1].split("}")[0].split(",")
            return tuple(float(v) for v in nums)
        except:
            return None

    def servoj_stream(self, target, duration=4.0):
        """Stream ServoJ from current position to target over duration seconds."""
        current = self._current_joints
        if current is None:
            current = self.get_joints()
        if current is None:
            print("  [ERR] Cannot get current joints")
            return False

        steps = max(int(duration * STEP_HZ), 5)
        print(f"  Streaming {steps} ServoJ steps over {duration:.1f}s")
        print(f"  From: {[round(v,2) for v in current]}")
        print(f"  To:   {[round(v,2) for v in target]}")

        # Pre-calculate trajectory
        traj = []
        for i in range(1, steps + 1):
            t = i / steps
            # Ease in-out: smoother acceleration
            t_smooth = t * t * (3 - 2 * t)
            pt = tuple(c + (g - c) * t_smooth for c, g in zip(current, target))
            traj.append(pt)

        # Stream - fire and forget (no recv during stream)
        t0 = time.time()
        for i, pt in enumerate(traj):
            cmd = "ServoJ({:.4f},{:.4f},{:.4f},{:.4f},{:.4f},{:.4f})\n".format(*pt)
            with self._lock:
                self.s.sendall(cmd.encode())
            elapsed = time.time() - t0
            next_t = (i + 1) * STEP_DELAY
            sleep = next_t - elapsed
            if sleep > 0:
                time.sleep(sleep)

        self._current_joints = target
        print(f"  Stream done in {time.time()-t0:.2f}s")
        time.sleep(0.5)  # let robot settle

        # Drain and check
        time.sleep(1.0)
        self.send("RobotMode()", wait=0.5)
        return True

    def DO(self, index, status):
        self.send(f"DO({index},{status})", wait=0.3)

    def close(self):
        self.s.close()


def run_pick_and_place():
    print("=== Dobot CR7 - ServoJ Pick & Place ===\n")
    r = DobotCR7()

    r.enable()
    time.sleep(1)

    joints = r.get_joints()
    print(f"\n  Start joints: {[round(v,2) for v in joints] if joints else 'unknown'}")
    r._current_joints = joints

    print("\n--- P1: Home ---")
    r.servoj_stream(JOINTS["P1"], duration=5.0)

    print("\n--- P2: approach pick ---")
    r.servoj_stream(JOINTS["P2"], duration=4.0)

    print("\n--- P3: pick position ---")
    r.servoj_stream(JOINTS["P3"], duration=2.0)

    print("\n--- DO(1,1): gripper ON ---")
    r.DO(1, 1)
    time.sleep(5.0)

    print("\n--- DO(2,1) ---")
    r.DO(2, 1)
    r.DO(1, 0)

    print("\n--- P2: retract ---")
    r.servoj_stream(JOINTS["P2"], duration=2.0)

    print("\n--- P4: place ---")
    r.servoj_stream(JOINTS["P4"], duration=5.0)

    print("\n--- DO(2,0): release ---")
    r.DO(2, 0)

    print("\n=== Done ===")
    r.close()


if __name__ == "__main__":
    run_pick_and_place()
