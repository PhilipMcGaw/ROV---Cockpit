"""Enforce documentation changes for behaviour-affecting pull-request files."""

import fnmatch
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / "tests" / "documentation_change_policy.json"

def matches(path: str, pattern: str) -> bool:
    return fnmatch.fnmatchcase(path, pattern) or fnmatch.fnmatchcase(path, pattern.replace("/**", "/*"))

def main() -> int:
    if len(sys.argv) < 2:
        print("[FAIL] Supply changed repository-relative paths to the documentation change policy.", file=sys.stderr)
        return 1
    rules = json.loads(RULES.read_text(encoding="utf-8"))
    changed = sorted({item.replace("\\", "/") for item in sys.argv[1:] if item})
    exempt = [(item["pattern"], item["reason"]) for item in rules["intentional_exemptions"]]
    classified = []
    for path in changed:
        exemption = next(((pattern, reason) for pattern, reason in exempt if matches(path, pattern)), None)
        if exemption:
            classified.append((path, "exempt", exemption[1]))
        elif any(matches(path, pattern) for pattern in rules["documentation_patterns"]):
            classified.append((path, "documentation", "documentation change"))
        elif any(matches(path, pattern) for pattern in rules["documentation_required_patterns"]):
            classified.append((path, "behaviour", "classified as potentially user-facing"))
        else:
            classified.append((path, "other", "no documentation trigger"))
    behaviour = [path for path, kind, _ in classified if kind == "behaviour"]
    documentation = [path for path, kind, _ in classified if kind == "documentation"]
    if behaviour and not documentation:
        print("[FAIL] Behaviour-affecting files changed without a documentation change:", file=sys.stderr)
        for path in behaviour:
            print(f"[FAIL]   {path}", file=sys.stderr)
        print("[FAIL] Update the relevant documentation and MASTER_CONTEXT.md where architecture or conventions change.", file=sys.stderr)
        return 1
    print(f"[PASS] Classified {len(changed)} changed file(s); {len(behaviour)} require documentation and {len(documentation)} documentation file(s) changed.")
    for path, kind, reason in classified:
        print(f"[INFO] [{kind}] {path}: {reason}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
