#!/bin/bash
# ============================================================
# NEO Series Bible: give GitHub what it needs to sign and notarize
# the Mac build. Run once on your Mac (double-click).
#
# Reads your existing ~/.series-bible-signing (the Series Bible's signing
# setup). If the GitHub CLI (gh) is installed and signed in, it stores the
# five secrets itself. Otherwise it copies each one to the clipboard, one at
# a time, for you to paste on GitHub's secrets page.
# Nothing is written anywhere else.
# ============================================================
REPO="authortroy/neo-series-bible"
CREDS="$HOME/.series-bible-signing"
PAGE="https://github.com/$REPO/settings/secrets/actions/new"

pause() { read -r -p "$1" _; }

[ -f "$CREDS" ] || { echo "No $CREDS. Set up Series Bible signing first (see its build-signed-mac.sh)."; pause "Press Return to close."; exit 1; }
# shellcheck disable=SC1090
source "$CREDS"

P12="$CSC_LINK"
P12_PASS="$CSC_KEY_PASSWORD"
if [ -z "$P12" ] || [ ! -f "$P12" ]; then
  cat <<MSG

GitHub needs your Developer ID certificate as a .p12 file.

  1. Open Keychain Access → login → My Certificates.
  2. Right-click "Developer ID Application: …" → Export…
  3. Save as series-bible-signing.p12 in your home folder, and choose a password.

MSG
  P12="$HOME/series-bible-signing.p12"
  pause "Press Return when $P12 is saved."
  [ -f "$P12" ] || { echo "Didn't find $P12."; pause "Press Return to close."; exit 1; }
  read -r -s -p "The password you gave the .p12: " P12_PASS; echo
fi

B64=$(base64 -i "$P12" | tr -d '\n')
NAMES=(CSC_LINK CSC_KEY_PASSWORD APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID)
VALUES=("$B64" "$P12_PASS" "$APPLE_ID" "$APPLE_APP_SPECIFIC_PASSWORD" "$APPLE_TEAM_ID")
for i in "${!NAMES[@]}"; do
  [ -n "${VALUES[$i]}" ] || { echo "${NAMES[$i]} is empty (check $CREDS)."; pause "Press Return to close."; exit 1; }
done

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "Storing the secrets on $REPO with the GitHub CLI…"
  for i in "${!NAMES[@]}"; do
    printf '%s' "${VALUES[$i]}" | gh secret set "${NAMES[$i]}" --repo "$REPO" && echo "  ✓ ${NAMES[$i]}"
  done
else
  echo ""
  echo "Opening GitHub's \"New secret\" page. For each one below: type the name,"
  echo "paste (⌘V) the value, click Add secret, then come back here."
  open "$PAGE"
  for i in "${!NAMES[@]}"; do
    printf '%s' "${VALUES[$i]}" | pbcopy
    echo ""
    echo "  Name:  ${NAMES[$i]}      (its value is on the clipboard)"
    pause "  Press Return when it's added… "
    [ "$i" -lt 4 ] && open "$PAGE"
  done
  printf '' | pbcopy
fi
echo ""
echo "Done. GitHub can now sign and notarize NEO Series Bible."
pause "Press Return to close."
