import asyncio, asyncssh, sys

ROBOT_IP = "192.168.5.1"
USER = "root"
PASS = "888888"

async def main():
    print(f"asyncssh version: {asyncssh.__version__}")
    print(f"Connecting to {USER}@{ROBOT_IP}...")
    try:
        conn = await asyncssh.connect(
            ROBOT_IP,
            username=USER,
            password=PASS,
            known_hosts=None,
            # Explicit algos compatible with OpenSSH 7.3
            kex_algs=["curve25519-sha256@libssh.org", "diffie-hellman-group14-sha1",
                      "diffie-hellman-group-exchange-sha256"],
            encryption_algs=["aes128-ctr", "aes256-ctr",
                             "aes128-gcm@openssh.com", "aes256-gcm@openssh.com"],
            mac_algs=["hmac-sha2-256", "hmac-sha1", "hmac-sha2-512"],
            server_host_key_algs=["ecdsa-sha2-nistp256", "ssh-rsa", "ssh-ed25519"],
        )
        print("[OK] Connected!\n")

        async with conn:
            cmds = [
                "uname -a",
                "ls /",
                "ls /dobot 2>/dev/null || ls /DobotControl 2>/dev/null || echo 'scanning...'",
                "find / -maxdepth 6 -name '*.lua' 2>/dev/null | head -40",
                "find / -maxdepth 5 -name '*api*' -o -name '*tcp*' -o -name '*dashboard*' 2>/dev/null | grep -v proc | head -30",
                "ps | head -30",
                "cat /proc/version 2>/dev/null",
            ]
            for cmd in cmds:
                print(f"\n$ {cmd}")
                result = await conn.run(cmd, check=False)
                if result.stdout:
                    print(result.stdout.strip()[:3000])
                if result.stderr:
                    print("[err]", result.stderr.strip()[:300])

    except asyncssh.DisconnectError as e:
        print(f"[DisconnectError] code={e.code} reason={e.reason}")
    except asyncssh.PermissionDenied as e:
        print(f"[PermissionDenied] {e}")
    except Exception as e:
        print(f"[{type(e).__name__}] {e}")
        import traceback; traceback.print_exc()

asyncio.run(main())
