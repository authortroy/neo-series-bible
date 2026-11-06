#!/bin/bash
# ============================================================
# NEO Series Bible — signed + notarized macOS build
#
# Uses the same signing setup as The Plot Dude's Series Bible:
# ~/.series-bible-signing (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD,
# APPLE_TEAM_ID, and optionally CSC_LINK / CSC_KEY_PASSWORD), and the
# series-bible-signing keychain that script makes.
#
# Usage:  ./build-series-bible-mac.sh            → signed + notarized .dmg files
#         ./build-series-bible-mac.sh --unsigned → for your own Macs only
# ============================================================
set -e
cd "$(dirname "$0")"

EXTRA=()
if [ "$1" = "--unsigned" ]; then
  export CSC_IDENTITY_AUTO_DISCOVERY=false
  unset APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID
  EXTRA+=(--config.mac.notarize=false)
  echo "Building UNSIGNED (open it the first time with right-click → Open)"
else
  CREDS="$HOME/.series-bible-signing"
  [ -f "$CREDS" ] || { echo "No $CREDS — see the Series Bible's build-signed-mac.sh, or run with --unsigned"; exit 1; }
  # shellcheck disable=SC1090
  source "$CREDS"
  for v in APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID; do
    [ -n "${!v}" ] || { echo "$v is empty in $CREDS"; exit 1; }
  done
  KC="$HOME/Library/Keychains/series-bible-signing.keychain-db"
  if [ -n "$CSC_LINK" ] && [ -f "$KC" ]; then
    security unlock-keychain -p "$CSC_KEY_PASSWORD" "$KC"
    export CSC_KEYCHAIN="$KC"
    unset CSC_LINK CSC_KEY_PASSWORD
  elif [ -n "$CSC_LINK" ]; then
    echo "Run the Series Bible's build-signed-mac.sh once first (it makes the signing keychain)."; exit 1
  fi
  export CSC_IDENTITY_AUTO_DISCOVERY=true
  echo "Notarizing with Apple ID $APPLE_ID (team $APPLE_TEAM_ID)"
fi

VERSION=$(node -p "require('./package.json').version")
echo "[1/3] Installing dependencies"
npm install --no-audit --no-fund

echo "[2/3] Testing"
npm test
npm run test:series-bible

# Build outside iCloud: Finder attributes stamped mid-build break codesign
OUT="$HOME/Library/Caches/neo-series-bible-build"
rm -rf "$OUT"; mkdir -p "$OUT"
echo "[3/3] Building NEO Series Bible $VERSION in $OUT (notarizing can take 5–15 minutes)"
npx electron-builder --mac --publish never --config.directories.output="$OUT" "${EXTRA[@]}"
mkdir -p dist
cp "$OUT"/*.dmg dist/
echo ""
echo "Done:"
ls -1 dist/*.dmg
