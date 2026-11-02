#!/usr/bin/env bash
# Installs the web app and the daily scrape timer as systemd USER units (Arch / CachyOS).
# Run from the repo root after: npm ci && npm run build
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
NPM_BIN="$(command -v npm)"

[ -f "$REPO_DIR/.env.local" ] || { echo "Missing $REPO_DIR/.env.local (needs CRON_SECRET)"; exit 1; }
[ -d "$REPO_DIR/.next" ] || { echo "Run 'npm run build' first"; exit 1; }

mkdir -p "$UNIT_DIR"
for unit in radar-web.service radar-scrape.service radar-scrape.timer; do
  sed -e "s|@REPO_DIR@|$REPO_DIR|g" -e "s|@NPM_BIN@|$NPM_BIN|g" \
    "$REPO_DIR/deploy/systemd/$unit" > "$UNIT_DIR/$unit"
done

# "Start apply" opens a visible browser: the user service needs your desktop session variables.
systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XAUTHORITY XDG_RUNTIME_DIR 2>/dev/null || true
systemctl --user daemon-reload
systemctl --user enable --now radar-web.service radar-scrape.timer
echo "Installed. Check: systemctl --user list-timers radar-scrape.timer"
echo "Keep timers running when logged out: sudo loginctl enable-linger $USER"
