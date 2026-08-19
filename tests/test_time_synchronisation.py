"""Contract checks for profile-driven browser time synchronisation."""

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from rov_cockpit.app import BrowserTimeSynchronisation, relay_browser_time


class TimeSynchronisationProfileTests(unittest.TestCase):
    def test_example_profiles_use_their_own_namespaced_subjects(self) -> None:
        for name in ("rov", "k9", "piwars"):
            path = ROOT / "configs" / "profiles" / f"{name}.json"
            profile = json.loads(path.read_text(encoding="utf-8"))
            config = profile["time_synchronisation"]
            namespace = profile["namespace"]
            self.assertTrue(config["enabled"])
            self.assertEqual(config["command_subject"], f"{namespace}.cockpit.command.system.time-sync")
            self.assertEqual(config["status_subject"], f"{namespace}.control.status.system.time-sync")
            self.assertEqual(config["interval_seconds"], 60)

    def test_server_relay_requires_an_authenticated_control_role(self) -> None:
        source = (ROOT / "src" / "rov_cockpit" / "app.py").read_text(encoding="utf-8")
        self.assertIn('@app.post("/api/system/time-sync")', source)
        self.assertIn('user["role"] not in {"driver", "admin"}', source)
        self.assertIn('await client.publish(config.command_subject', source)
        header = (ROOT / "src" / "rov_cockpit" / "templates" / "header.jinja").read_text(encoding="utf-8")
        self.assertIn("return Number.isFinite(result.interval_seconds)", header)

    def test_authenticated_driver_relay_publishes_active_profile_message(self) -> None:
        class FakeNatsClient:
            def __init__(self) -> None:
                self.published: list[tuple[str, bytes]] = []
                self.flushed = False

            async def publish(self, subject: str, payload: bytes) -> None:
                self.published.append((subject, payload))

            async def flush(self, *, timeout: int) -> None:
                self.flushed = timeout == 1

        client = FakeNatsClient()
        request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(nats_client=client)))

        async def relay() -> dict[str, object]:
            with patch("rov_cockpit.app.authenticated_user", return_value={"role": "driver"}):
                return await relay_browser_time(
                    BrowserTimeSynchronisation(unix_time_ms=1_767_225_600_000), request
                )

        result = asyncio.run(relay())
        self.assertEqual(result["accepted"], True)
        self.assertTrue(client.flushed)
        self.assertEqual(client.published[0][0], "rov.cockpit.command.system.time-sync")
        message = json.loads(client.published[0][1])
        self.assertEqual(message["value"], 1_767_225_600_000)
        self.assertEqual(message["units"], "ms")
        self.assertEqual(message["profile"], "rov")


if __name__ == "__main__":
    unittest.main()
