import json, time, urllib.request, threading

def call(i, results):
    body = json.dumps({
        "content": f"只回复数字{i}",
        "agent": {"id": "t", "name": "T", "apiKey": "pool-managed", "llmProvider": "zhipu",
                  "model": "glm-5.1", "agentPlatform": "direct", "skills": [], "channels": []}
    }).encode()
    req = urllib.request.Request("http://localhost:3101/api/chat", data=body,
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            buf = b""
            for chunk in r:
                buf += chunk
        text = buf.decode("utf-8", "ignore")
        done = '"type":"done"' in text or '"type": "done"' in text
        err = '"type":"error"' in text
        results[i] = (round(time.time()-t0, 1), done, err, len(text))
    except Exception as e:
        results[i] = (round(time.time()-t0, 1), False, True, str(e)[:80])

results = {}
t0 = time.time()
threads = [threading.Thread(target=call, args=(i, results)) for i in (1, 2, 3)]
[t.start() for t in threads]
[t.join() for t in threads]
wall = round(time.time()-t0, 1)
for i in sorted(results): print(f"  chat#{i}: {results[i][0]}s done={results[i][1]} err={results[i][2]} bytes={results[i][3]}")
print(f"并发3路 /api/chat 总墙钟: {wall}s, 成功={sum(1 for r in results.values() if r[1] and not r[2])}/3")
