# Test script execution commands and find firmware version
import socket, time

ROBOT_IP = "192.168.5.1"

def send(s, cmd):
    s.sendall((cmd + "\n").encode())
    time.sleep(0.5)
    resp = s.recv(4096).decode().strip()
    ok = "OK" if resp.startswith("0,") else "--"
    print(f"  [{ok}] {cmd}")
    print(f"         {resp}")
    return resp

s = socket.socket()
s.settimeout(8)
s.connect((ROBOT_IP, 29999))

# Find firmware version
for cmd in ["Version()", "Firmware()", "GetSWVersion()", "GetFirmwareVersion()", "SWVersion()"]:
    send(s, cmd)

print()

# Script control commands
for cmd in ["StartScript()", "StopScript()", "PauseScript()",
            "RunScript(0)", "RunScript(src0)", 'RunScript("src0")',
            'LoadScript("src0.lua")', 'RunScript("src0.lua")',
            "GetScriptState()", "ScriptState()"]:
    send(s, cmd)

s.close()
