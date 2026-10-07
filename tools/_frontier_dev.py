import subprocess, time, sys, urllib.request, os

LOG = "frontier_dev.log"
env = dict(os.environ)
env["ELECTRON_RUN_AS_NODE"] = "1"
proc = subprocess.Popen(
    ["npm", "run", "dev", "--", "--webpack", "-p", "3001"],
    stdout=open(LOG, "w", encoding="utf-8"),
    stderr=subprocess.STDOUT,
    cwd=r"C:\Users\一梦\Documents\kimi\workspace",
    shell=True,
    env=env,
)
print("PID:", proc.pid)
with open("frontier_dev.pid", "w") as f:
    f.write(str(proc.pid))

for i in range(90):
    try:
        r = urllib.request.urlopen("http://localhost:3001/api/llm-pool/status", timeout=3)
        print("READY after", i * 2, "s, status", r.status)
        break
    except Exception:
        time.sleep(2)
else:
    print("TIMEOUT waiting for dev server")
    sys.exit(1)
