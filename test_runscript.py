# Find correct RunScript path and list available scripts
import socket, time

ROBOT_IP = "192.168.5.1"

def send(s, cmd, wait=0.5):
    s.sendall((cmd + "\n").encode())
    time.sleep(wait)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")
    return resp

s = socket.socket()
s.settimeout(8)
s.connect((ROBOT_IP, 29999))

# Try to find/list scripts
for cmd in ["GetFiles()", "ListFiles()", "GetProject()", "ListProjects()",
            "GetScripts()", "GetTaskList()", "ProjectList()"]:
    send(s, cmd)

print()
# Try RunScript with project path variants
for path in ["123", "123/src0", "123/src0.lua", "/project/123/src0",
             "src0", "project/123/src0", "/lua/src0"]:
    send(s, f'RunScript("{path}")')

s.close()
