import subprocess, time

PLINK = r"C:\Program Files\PuTTY\plink.exe"
CMD = "uname -a && echo '===LS===' && ls / && echo '===FIND LUA===' && find / -maxdepth 6 -name '*.lua' 2>/dev/null | head -40 && echo '===FIND API===' && find / -maxdepth 5 \\( -name '*api*' -o -name '*tcp*' -o -name '*dobot*' \\) 2>/dev/null | grep -v proc | head -30 && echo '===PS===' && ps | head -30 && echo '===DONE==='"

proc = subprocess.Popen(
    [PLINK, "-ssh", "-pw", "888888", "root@192.168.5.1", CMD],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT
)

# Send 'y' to accept host key
try:
    stdout, _ = proc.communicate(input=b"y\n", timeout=25)
    print(stdout.decode(errors="replace"))
except subprocess.TimeoutExpired:
    proc.kill()
    out, _ = proc.communicate()
    print("TIMEOUT. Output so far:")
    print(out.decode(errors="replace"))
