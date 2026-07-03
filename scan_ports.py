# Scan open TCP ports on robot
import socket, concurrent.futures

ROBOT_IP = "192.168.5.1"
PORTS_TO_CHECK = list(range(29990, 30020)) + [502, 5000, 8080, 8000, 7000, 4000, 4001, 4002]

def check(port):
    s = socket.socket()
    s.settimeout(0.5)
    try:
        s.connect((ROBOT_IP, port))
        s.close()
        return port, True
    except:
        return port, False

print(f"Scanning {ROBOT_IP}...\n")
with concurrent.futures.ThreadPoolExecutor(max_workers=30) as ex:
    results = list(ex.map(check, PORTS_TO_CHECK))

open_ports = [p for p, ok in sorted(results) if ok]
print(f"Open ports: {open_ports}")
