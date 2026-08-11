#!/bin/bash
su -c 'cd /home/pi/ROV/Cockpit && PYTHONPATH=src .venv/bin/uvicorn rov_cockpit.app:app --host 0.0.0.0 --port 8080' pi
