"""Smoke-test the real Next route, then always stop its process tree."""
from __future__ import annotations

import json
import os
import secrets
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:7100/api/garden-ecosystem"
TOKEN = secrets.token_urlsafe(32)


def post(action: str) -> tuple[int, dict]:
    request = urllib.request.Request(URL, data=json.dumps({"action": action, "params": {}}).encode(),
                                     headers={"Content-Type": "application/json",
                                              "Authorization": f"Bearer {TOKEN}"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def main() -> None:
    with socket.socket() as probe:
        probe.settimeout(0.5)
        if probe.connect_ex(("127.0.0.1", 7100)) == 0:
            raise RuntimeError("port 7100 is already occupied; no existing process was touched")
    process = subprocess.Popen(
        ["npm.cmd", "run", "dev", "--", "--hostname", "127.0.0.1", "--port", "7100"],
        cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, encoding="utf-8", errors="replace",
        env={**os.environ, "GARDEN_AGENT_TOKEN": TOKEN},
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    result = {}
    failure = None
    try:
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("Next dev server exited before becoming ready")
            try:
                status, capabilities = post("capabilities")
                result["last_probe_status"] = status
                result["last_probe_body"] = capabilities
                if status == 200 and capabilities.get("ok"):
                    break
            except (OSError, ValueError) as error:
                result["last_probe_error"] = f"{type(error).__name__}: {error}"
                time.sleep(0.5)
        else:
            raise TimeoutError("Next dev server did not become ready")
        lean_status, lean = post("lean_health")
        invalid_status, _ = post("shell")
        result = {
            "capabilities_ok": capabilities["ok"],
            "lean_status_http": lean_status,
            "lean": lean.get("result"),
            "invalid_action_http": invalid_status,
        }
        if lean_status != 200 or invalid_status != 400:
            raise AssertionError(result)
    except Exception as error:
        failure = error
    finally:
        if process.poll() is None:
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           capture_output=True, timeout=15, check=False)
        process.wait(timeout=15)
        log_tail = process.stdout.read()[-3000:] if process.stdout else ""
        with socket.socket() as probe:
            probe.settimeout(0.5)
            result["server_stopped"] = probe.connect_ex(("127.0.0.1", 7100)) != 0
        if not result["server_stopped"] and failure is None:
            failure = RuntimeError("preview server did not stop")
    if failure is not None:
        result["error"] = str(failure)
        result["log_tail"] = log_tail
        print(json.dumps(result, ensure_ascii=False))
        raise failure
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
