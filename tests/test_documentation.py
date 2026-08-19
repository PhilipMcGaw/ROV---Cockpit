"""Repository documentation currency checks."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = (ROOT / "MASTER_CONTEXT.md", ROOT / "CONTRIBUTING.md", ROOT / "docs" / "README.md", ROOT / "docs" / "documentation-policy.md", ROOT / "docs" / "status.md", ROOT / "docs" / "development.md", ROOT / "docs" / "deployment.md", ROOT / "docs" / "testing.md")
REQUIRED_TERMS = ("Implemented", "Automated-test verification", "Bench-tested", "Production-validated", "Planned or unverified")
REQUIRED_ARTIFACTS = ("frontend/src/transport/telemetry-websocket.ts", "frontend/src/telemetry/store.ts", "frontend/src/components/instruments/rov-depth.ts", "src/rov_cockpit/static/dist/main.js", "src/rov_cockpit/static/dist/components/rov-depth.js", "configs/nats.env.example", "scripts/1_install_dependencies.bat", "scripts/2_start_app.bat")
REQUIRED_LICENSE_ENTRIES = ("Vue 3", "Pico CSS", "Font Awesome", "Leaflet", "jQuery", "Flight Indicators", "Weather Icons")

def fail(message: str) -> None:
    print(f"[FAIL] {message}", file=sys.stderr)
    raise SystemExit(1)

def main() -> int:
    missing = [str(path.relative_to(ROOT)) for path in REQUIRED_FILES if not path.is_file()]
    if missing:
        fail("Required documentation files are missing: " + ", ".join(missing))
    maintained = [ROOT / "MASTER_CONTEXT.md", ROOT / "CONTRIBUTING.md", *sorted((ROOT / "docs").glob("*.md"))]
    text = "\n".join(path.read_text(encoding="utf-8") for path in maintained)
    missing_terms = [term for term in REQUIRED_TERMS if term not in text]
    if missing_terms:
        fail("Required documentation status terms are missing: " + ", ".join(missing_terms))
    status = (ROOT / "docs" / "status.md").read_text(encoding="utf-8")
    missing_refs = [ref for ref in REQUIRED_ARTIFACTS if ref not in status or not (ROOT / ref).exists()]
    if missing_refs:
        fail("Required status artefact references are missing or invalid: " + ", ".join(missing_refs))
    license_map = ROOT / "LICENSES.md"
    if not license_map.is_file():
        fail("The third-party licence register is missing: LICENSES.md")
    license_text = license_map.read_text(encoding="utf-8")
    missing_licences = [entry for entry in REQUIRED_LICENSE_ENTRIES if entry not in license_text]
    if missing_licences:
        fail("Third-party licence register is missing entries: " + ", ".join(missing_licences))
    for document in maintained:
        if not re.search(r"^#", document.read_text(encoding="utf-8"), re.MULTILINE):
            fail(f"Maintained documentation has no Markdown heading: {document.relative_to(ROOT)}")
    print(f"[PASS] Documentation currency audit passed for {len(maintained)} maintained documents.")
    print(f"[PASS] Verified {len(REQUIRED_ARTIFACTS)} documented artefact references.")
    print(f"[PASS] Verified {len(REQUIRED_LICENSE_ENTRIES)} third-party licence entries.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
