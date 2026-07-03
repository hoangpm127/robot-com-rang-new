"""SSH into robot using socket-level SSH implementation"""
import socket, subprocess, sys, os, time

ROBOT_IP = "192.168.5.1"
PASSWORD = "888888"

# Try using Windows OpenSSH with expect-like approach via pexpect
# First check if pexpect is available
try:
    import pexpect
    USE_PEXPECT = True
except ImportError:
    USE_PEXPECT = False

if USE_PEXPECT:
    child = pexpect.spawn(f"ssh -o StrictHostKeyChecking=no root@{ROBOT_IP}")
    child.expect("password:")
    child.sendline(PASSWORD)
    child.expect(r"\$|#")

    for cmd in ["uname -a", "ls /", "find / -maxdepth 5 -name '*.lua' 2>/dev/null | head -20"]:
        child.sendline(cmd)
        child.expect(r"\$|#", timeout=10)
        print(child.before.decode())
else:
    # Use subprocess with the ssh key trick
    # Generate a temp key, use -o IdentitiesOnly to avoid prompts
    print("pexpect not available, trying subprocess approach")

    # Write password to a helper script
    helper = os.path.join(os.environ.get("TEMP","C:/Temp"), "ssh_pass.sh")
    with open(helper, "w") as f:
        f.write(f"#!/bin/sh\necho {PASSWORD}\n")

    env = os.environ.copy()
    env["SSH_ASKPASS"] = helper
    env["SSH_ASKPASS_REQUIRE"] = "force"
    env["DISPLAY"] = ":0"

    result = subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no",
         "-o", "NumberOfPasswordPrompts=1",
         f"root@{ROBOT_IP}", "uname -a; ls /"],
        env=env, capture_output=True, text=True, timeout=15
    )
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    print("RC:", result.returncode)
