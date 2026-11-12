#!/bin/bash
# Start the compiled offline build on 127.0.0.1 and open the browser.
cd "$(dirname "$0")" || exit 1
PORT="${BEERAI_PORT:-4173}"
find_node() {
  for c in "$(command -v node 2>/dev/null)" /usr/local/bin/node /opt/homebrew/bin/node "$HOME"/.nvm/versions/node/*/bin/node "$HOME/.volta/bin/node"; do
    if [ -n "$c" ] && [ -x "$c" ]; then echo "$c"; return 0; fi
  done
  return 1
}
NODE="$(find_node)"
if [ -z "$NODE" ]; then
  echo "[BeerAI] Node.js was not found on this Mac. Opening the standalone 2D control room."
  open "fallback/beerai-control-2d.html"
  read -r -p "Press Enter to close this window..." _
  exit 1
fi
if [ ! -f "dist/index.html" ]; then
  echo "[BeerAI] The production build is missing (dist/index.html). Run npm run build during preparation."
  open "fallback/beerai-control-2d.html"
  read -r -p "Press Enter to close this window..." _
  exit 1
fi
echo "[BeerAI] Node $("$NODE" -v) — Brewery Control Room 3D"
echo "[BeerAI] If port $PORT is busy, the next available port will be used. See the URL below."
echo "[BeerAI] Stop the server with Ctrl+C or close this window."
OPEN_FLAG="--open"
[ -n "$BEERAI_NO_OPEN" ] && OPEN_FLAG=""
exec "$NODE" scripts/serve.mjs --root dist --port "$PORT" $OPEN_FLAG
