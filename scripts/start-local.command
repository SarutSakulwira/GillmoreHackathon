#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
RUNTIME_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if command -v node >/dev/null 2>&1; then
  FINDAPET_NODE="$(command -v node)"
elif [ -x "$RUNTIME_NODE" ]; then
  FINDAPET_NODE="$RUNTIME_NODE"
else
  echo "Install Node.js 24 or newer, then run npm install, npm run build and npm start."
  exit 1
fi
"$FINDAPET_NODE" node_modules/typescript/bin/tsc --noEmit
"$FINDAPET_NODE" node_modules/vite/bin/vite.js build
echo "Open http://127.0.0.1:3001 in your browser. Keep this window open."
exec "$FINDAPET_NODE" server/index.mjs
