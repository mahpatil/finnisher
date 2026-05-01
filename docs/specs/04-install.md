# Spec: install.sh — Curl-Installable Bootstrap

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-01

## Problem
Non-technical users and developers who don't want to deal with npm global installs need a single curl command that sets up `finn` end-to-end: install the package, verify it works, and run `finn setup`. The script must handle common failure modes gracefully.

## Context
Builds on Phases 1–3 (DB, CLI, hooks). The package is published to npm as `finnisher`. The install script lives at the repo root and is served from the GitHub raw URL. Targets macOS and Linux. Windows is out of scope for MVP.

## Acceptance Criteria

- [ ] Given `curl -fsSL <url> | sh` is run on macOS with Node.js ≥ 18 and npm installed, then `finn` is available on PATH and `finn setup` has run successfully
- [ ] Given `curl -fsSL <url> | sh` is run on Linux with Node.js ≥ 18 and npm installed, then same result
- [ ] Given Node.js is not installed, then the script prints a clear message with the Node.js download URL and exits 1
- [ ] Given `finn` is already installed, then the script upgrades it (`npm install -g finnisher@latest`) and re-runs `finn setup`
- [ ] Given the script completes successfully, then it prints a "next steps" message showing `finn add` and `finn web`
- [ ] Given `npm install -g` fails (network error, permissions), then the script prints a human-readable error and suggests `sudo` or `--prefix` fallback
- [ ] The script is idempotent — running it twice leaves the system in the same state

## Technical Design

### Data Model Changes
None.

### API / Interface Changes
**File:** `install.sh` (repo root)

Script flow:
```
1. Check bash/sh availability
2. Check node >= 18 (node --version)
3. Check npm availability
4. npm install -g finnisher
5. Verify `finn --version` succeeds
6. finn setup
7. Print success + next steps
```

**Script skeleton:**
```bash
#!/bin/sh
set -e

REQUIRED_NODE_MAJOR=18
FINNISHER_PKG="finnisher"

# ── Check Node.js ──────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  echo "Install it from https://nodejs.org (LTS recommended)"
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Error: Node.js >= ${REQUIRED_NODE_MAJOR} required (found $NODE_MAJOR)"
  exit 1
fi

# ── Install ─────────────────────────────────────────────────────────────────
echo "Installing finnisher..."
npm install -g "$FINNISHER_PKG" || {
  echo ""
  echo "npm install failed. Try:"
  echo "  sudo npm install -g $FINNISHER_PKG"
  echo "or set a user prefix: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally"
  exit 1
}

# ── Verify ───────────────────────────────────────────────────────────────────
if ! command -v finn >/dev/null 2>&1; then
  echo "Error: finn installed but not found on PATH."
  echo "Add npm global bin to PATH: export PATH=\"\$(npm bin -g):\$PATH\""
  exit 1
fi

# ── Setup ────────────────────────────────────────────────────────────────────
finn setup

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Finnisher installed successfully!"
echo ""
echo "Quick start:"
echo "  finn add          # add your first thread"
echo "  finn list         # see active threads"
echo "  finn web          # open dashboard at http://localhost:3141"
echo ""
echo "Link a project to a thread:"
echo "  echo \"<thread-id>\" > .finn-thread"
```

### Key Logic
- `set -e` stops on any unhandled error
- npm failure block uses `|| { ... exit 1 }` pattern (compatible with `set -e` + pipe)
- Node version check uses `node -e` to avoid `bc` dependency
- Script uses `sh` (POSIX) not `bash` for maximum compatibility

## Test Scenarios

### Happy Path
1. Clean macOS with Node 20, npm 10 → `curl ... | sh` → `finn --version` works, `finn list` works
2. Run script twice → no error, version upgraded (or same), `finn setup` re-runs cleanly

### Edge Cases
1. Node 18.0.0 (minimum) → passes version check
2. `finn` already on PATH at older version → npm upgrades it
3. Linux (Ubuntu 22.04) → same result as macOS
4. npm global prefix requires sudo → clear message with fallback instructions

### Error Cases
1. No Node.js → "Error: Node.js is required..." + download URL, exit 1
2. Node 16 installed → "Error: Node.js >= 18 required..." exit 1
3. Network down during npm install → npm error surfaced + fallback message, exit 1
4. `finn` not on PATH after install → PATH fix instructions, exit 1

## Out of Scope
- Windows support (PowerShell / winget install)
- Homebrew formula
- Docker image
- Automatic PATH modification (too risky without shell detection)
- Version pinning (always installs latest)

## Open Questions
None.

## Implementation Notes
- File must use LF line endings (not CRLF) — add `.gitattributes` entry: `install.sh text eol=lf`
- Must be executable in the repo: `chmod +x install.sh`
- The curl command in README must use `-fsSL` flags: fail on error, silent, follow redirects
- Raw GitHub URL format: `https://raw.githubusercontent.com/mahpatil/finnisher/main/install.sh`
- No `bash`-specific syntax — use `sh` for Alpine/minimal Linux compatibility
