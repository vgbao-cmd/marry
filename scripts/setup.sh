#!/usr/bin/env bash
set -euo pipefail
cd /workspace/marry
npm ci --no-audit --no-fund
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock.txt
npm run build
.venv/bin/python -m pytest backend/tests -q
