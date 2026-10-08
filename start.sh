#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f public/data.json ]]; then
  python3 scripts/build_data.py
fi
npm run build
printf '网站服务地址：http://127.0.0.1:4172/\n'
exec python3 -m http.server 4172 --bind 127.0.0.1 --directory dist
