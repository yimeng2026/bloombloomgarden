#!/usr/bin/env python3
"""
Push files to GitHub using the Contents API.
Usage: python3 push-via-api.py <GITHUB_TOKEN>
"""
import json
import base64
import os
import sys
import urllib.request

TOKEN = sys.argv[1] if len(sys.argv) > 1 else None
if not TOKEN:
    print("Usage: python3 push-via-api.py <GITHUB_TOKEN>")
    sys.exit(1)

REPO = "yimeng2026/bloombloomgarden"
BRANCH = "main"
APIBase = f"https://api.github.com/repos/{REPO}"
Headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "BloomBloomGarden-Push"
}

def api(method, path, data=None):
    url = ApiBase + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=Headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return str(e), None

# Get current commit SHA
status, ref = api("GET", f"/git/refs/heads/{BRANCH}")
if status != 200:
    print(f"Failed to get ref: {status}")
    sys.exit(1)
current_sha = ref["object"]["sha"]
print(f"Current {BRANCH} SHA: {current_sha}")

# Get tree SHA
status, commit = api("GET", f"/git/commits/{current_sha}")
tree_sha = commit["tree"]["sha"]
print(f"Current tree SHA: {tree_sha}")

# List all files to push
files_to_push = []
for root, dirs, filenames in os.walk("."):
    # Skip unwanted directories
    dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".next", "download", "upload", "tool-results", "skills", "db"}]
    for f in filenames:
        filepath = os.path.join(root, f).lstrip("./")
        files_to_push.append(filepath)

print(f"Files to push: {len(files_to_push)}")

# Push each file
for filepath in files_to_push:
    with open(filepath, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    
    # Check if file exists
    status, existing = api("GET", f"/contents/{filepath}?ref={BRANCH}")
    
    data = {
        "message": f"Update {filepath}",
        "content": content,
        "branch": BRANCH,
    }
    if status == 200:
        data["sha"] = existing["sha"]
    
    status, result = api("PUT", f"/contents/{filepath}", data)
    if status in (200, 201):
        print(f"  ✅ {filepath}")
    else:
        print(f"  ❌ {filepath}: {status} {result.get('message','?')}")

print("\n✅ Push complete!")
