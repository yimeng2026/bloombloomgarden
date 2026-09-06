"""启动 Next dev server（分离子进程），打印 PID 供后续 taskkill"""
import subprocess, sys, os

NODE = r"C:\Users\一梦\AppData\Local\Programs\kimi-desktop\resources\resources\runtime\node.exe"
ROOT = r"C:\Users\一梦\Documents\kimi\workspace"
PORT = "3101"

env = dict(os.environ)
env["PORT"] = PORT
log = open(os.path.join(ROOT, "dev_server.log"), "w", encoding="utf-8")
DETACHED = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
p = subprocess.Popen(
    [NODE, os.path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", PORT],
    cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
    creationflags=DETACHED, close_fds=True,
)
print(f"PID={p.pid} PORT={PORT}")
