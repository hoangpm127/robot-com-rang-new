# Check file upload options and decode port 30006 binary
import socket, time, struct

ROBOT_IP = "192.168.5.1"

def check_port(port, label):
    s = socket.socket()
    s.settimeout(2)
    try:
        s.connect((ROBOT_IP, port))
        # try to read banner
        try:
            banner = s.recv(256)
            try:
                print(f"  Port {port} ({label}): OPEN - banner: {banner.decode().strip()[:80]}")
            except:
                print(f"  Port {port} ({label}): OPEN - binary {len(banner)}b: {banner.hex()[:40]}")
        except:
            print(f"  Port {port} ({label}): OPEN - no banner")
        s.close()
        return True
    except ConnectionRefusedError:
        print(f"  Port {port} ({label}): REFUSED")
    except:
        print(f"  Port {port} ({label}): TIMEOUT")
    return False

print("=== Checking file transfer ports ===")
check_port(21,   "FTP")
check_port(22,   "SSH")
check_port(80,   "HTTP")
check_port(8080, "HTTP-alt")
check_port(8888, "HTTP-alt2")
check_port(443,  "HTTPS")

print("\n=== Decode port 30006 (12-byte response) ===")
s = socket.socket()
s.settimeout(5)
s.connect((ROBOT_IP, 30006))
# Try sending different things and reading 12-byte responses
for cmd in [b"\n", b"ping\n", b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"]:
    s.sendall(cmd)
    time.sleep(0.3)
    try:
        data = s.recv(64)
        print(f"  send {cmd!r} -> {len(data)}b: {data.hex()} | ints: {list(data)}")
        if len(data) >= 4:
            val = struct.unpack('<i', data[:4])[0]
            print(f"    first int32 LE: {val}")
    except:
        pass
s.close()

print("\n=== Try LoadLua inline command ===")
s = socket.socket()
s.settimeout(5)
s.connect((ROBOT_IP, 29999))
def send(s, cmd):
    s.sendall((cmd + "\n").encode())
    time.sleep(0.5)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")

# Try inline Lua execution
for cmd in ['ExecLua("MovJ(-186,0,400,0,0,0)")',
            'Exec("MovJ(-186,0,400,0,0,0)")',
            'LuaExec("MovJ(-186,0,400,0,0,0)")',
            'Execute("MovJ(-186,0,400,0,0,0)")',
            'Call("MovJ",-186,0,400,0,0,0)',
            "RobotMode()"]:
    send(s, cmd)
s.close()
