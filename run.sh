#!/usr/bin/env bash
# DIMORA — start the backend (macOS / Linux). Opens on http://127.0.0.1:8000
set -e
cd "$(dirname "$0")/backend"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
. .venv/bin/activate
pip install -q -r requirements.txt
[ -f .env ] || cp .env.example .env
python app.py
