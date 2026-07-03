# Test simple coordinates + official Dobot SDK format
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

# Get current position
send(s, "GetPose()")

# Try simple known-good coordinates
send(s, "MovJ(0,0,400,0,0,0)")
send(s, "MovJ(100,0,400,0,0,0)")

# Official SDK format uses {:f} which gives 6 decimal places
x,y,z,rx,ry,rz = -186.246552,-231.564117,357.991058,-179.293259,7.269885,178.68074
send(s, "MovJ({:f},{:f},{:f},{:f},{:f},{:f})".format(x,y,z,rx,ry,rz))

# Try with explicit SpeedJ and AccJ as required params
send(s, f"MovJ({x:f},{y:f},{z:f},{rx:f},{ry:f},{rz:f},50,50)")

# Check if there is a "SetMode" or "RemoteMode" command
send(s, "SetMode(1)")
send(s, "SetRobotMode(5)")

# Check current connection info
send(s, "GetConnectedClients()")
send(s, "TCPMode()")

s.close()
