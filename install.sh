#!/bin/sh
set -e

REQUIRED_NODE_MAJOR=18
FINNISHER_PKG="finnisher"

# ── Check Node.js ──────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org (LTS recommended)"
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Error: Node.js >= ${REQUIRED_NODE_MAJOR} required (found $NODE_MAJOR)."
  echo "Upgrade at https://nodejs.org"
  exit 1
fi

# ── Check npm ─────────────────────────────────────────────────────────────────
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not installed."
  echo "Install Node.js (which includes npm) from https://nodejs.org"
  exit 1
fi

# ── Install ───────────────────────────────────────────────────────────────────
echo "Installing finnisher..."
npm install -g "$FINNISHER_PKG" || {
  echo ""
  echo "npm install failed. Try:"
  echo "  sudo npm install -g $FINNISHER_PKG"
  echo "or set a user prefix: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally"
  exit 1
}

# ── Verify ────────────────────────────────────────────────────────────────────
if ! command -v finn >/dev/null 2>&1; then
  echo "Error: finn installed but not found on PATH."
  echo "Add npm global bin to PATH:"
  echo "  export PATH=\"\$(npm bin -g):\$PATH\""
  exit 1
fi

# ── Setup ─────────────────────────────────────────────────────────────────────
finn setup

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "Finnisher installed successfully!"
echo ""
echo "Quick start:"
echo "  finn add          # add your first thread"
echo "  finn list         # see active threads"
echo "  finn web          # open dashboard at http://localhost:3141"
echo ""
echo "Link a project to a thread:"
echo "  echo \"<thread-id>\" > .finn-thread"
