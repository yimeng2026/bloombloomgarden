"""只读复核旧 TOE p+ip 实现：实际输出与 docstring 是否一致。"""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
# 当前工作区可能通过目录联接映射到 D 盘；旧源仓以实际工作区路径定位。
DEFAULT_SOURCE = Path(r"C:\Users\一梦\Documents\kimi\workspace\toe-sylva-audit\papers\topo_quantum_internet\verify_topo_qinternet.py")
OUT = HERE / "legacy_pip_chern_audit.json"


def main() -> int:
    source = DEFAULT_SOURCE
    before = source.read_bytes()
    spec = importlib.util.spec_from_file_location("legacy_pip_readonly", source)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    actual = {f"mu={int(mu)}": module.chern_number_pip(1.0, 0.5, mu, nk=80) for mu in (-1.0, 1.0)}
    documented = {"mu=-1": 1, "mu=1": -1}  # 原文件第87–90行的文字相图。
    result = {
        "schema": "legacy-pip-readonly-audit-v1",
        "source": str(source),
        "source_sha256_before": hashlib.sha256(before).hexdigest(),
        "source_sha256_after": hashlib.sha256(source.read_bytes()).hexdigest(),
        "source_unchanged": before == source.read_bytes(),
        "actual": actual,
        "docstring": documented,
        "docstring_matches_actual": actual == documented,
        "vector_in_source": "d=(Re Delta, +Im Delta, epsilon)",
        "vector_required_by_bdg": "E=(Re Delta, -Im Delta, epsilon)",
        "command": "python papers/topo-quantum-internet/verification/audit_legacy_pip.py",
        "scope": "只读运行旧函数，不修改旧仓库；新裁决以双方法结果为准。",
    }
    result["status"] = "docstring_mismatch_confirmed" if actual != documented and result["source_unchanged"] else "review_required"
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "docstring_mismatch_confirmed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
