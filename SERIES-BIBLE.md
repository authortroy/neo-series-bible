# NEO Series Bible

This is Hugh Howey's NEO (MIT license) with The Plot Dude's Series Bible built in. It is a fork, kept as a branch (`series-bible`) on top of NEO's own history so new NEO releases can be merged in.

## What it adds

- **Characters, Locations and Events tabs** after Darlings, for any book whose folder holds a `series-bible.json`. They are view only; the bible is edited in the Series Bible app. Find (⌘F) searches them.
- **"Series Bible Summary of What You Wrote"** on each chapter that has an AI summary: on its outline card (short label "Series Bible" while the card is closed, the full label when it is open), under its line in the outline's List view, and on the chapter's card in the pane beside the page. It sits under the writer's own note and never changes it.
- NEO never writes `series-bible.json`. It reads it when a book opens and on every refresh (window focus, and every 30 seconds), so new summaries appear without reopening the book.

## Its own app, and its own updates

- App id `com.plotdude.neo-seriesbible`, name **NEO Series Bible**, package `neo-series-bible`.
- It updates itself like NEO does, but from this fork's releases at **github.com/authortroy/neo-series-bible**, never from Hugh's, so plain NEO can never replace it.
- It uses NEO's settings folder, so it opens the same library. NEO's single-instance lock then keeps NEO and NEO Series Bible from having the library open at the same time.

### Version numbers

NEO's major.minor, and NEO's patch × 100 + this fork's revision: NEO 1.6.3 → **1.6.300**, a fix of ours → 1.6.301, NEO 1.6.4 → 1.6.400. Every release is newer than the last, so the updater offers each one. `seriesBible.neoVersion` in package.json says which NEO it's built on. `scripts/series-bible-identity.js` sets all of this (name, id, version, where updates come from); run it after any change to package.json.

### Releases

- **New NEO releases arrive by themselves.** `.github/workflows/follow-neo.yml` runs every morning (or press *Run workflow* on the Actions tab). When Hugh has published a newer NEO it merges it, runs NEO's tests and the Series Bible's, then tags and builds the release. If the merge needs a person, or a test fails, nothing is released and it opens an issue (GitHub emails it to you).
- **A change of ours:** `node scripts/series-bible-identity.js --bump`, commit, then `git tag v<version> && git push origin main v<version>`.
- **The build** (`.github/workflows/build.yml`, NEO's own) makes signed, notarized Mac installers plus Windows and Linux ones, attaches them to a draft release, and publishes it when all are there. Only published releases reach the updater.
- **Signing** needs five repository secrets (Settings → Secrets and variables → Actions): `CSC_LINK` (the Developer ID .p12, base64), `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Without them the Mac build fails and nothing is published.
- NEO Pocket isn't built here (its workflow only runs by hand).

## The file: `series-bible.json`

The Series Bible app (1.3.0 and later) writes it into the NEO book folder, only when what it says changes.

```json
{
  "format": "plotdude-series-bible",
  "version": 1,
  "updated": "2026-11-06T16:20:00Z",
  "book": { "title": "…", "series": "…" },
  "chapters": { "<NEO chapter id>": { "title": "…", "summary": "…", "updated": "…" } },
  "characters": [{ "name", "role", "description", "physical", "personality", "backstory", "relationships", "firstAppearance", "notes" }],
  "locations": [{ "name", "type", "description", "significance", "firstAppearance", "notes" }],
  "events": [{ "chapter", "title", "description", "characters", "location", "significance", "source" }]
}
```

A file without `"format": "plotdude-series-bible"`, or one that doesn't parse, is ignored.

## Where the code is

Every change is marked **SERIES BIBLE EDITION**.

| File | Change |
|---|---|
| `app.js` | The `SERIES BIBLE` section (just before `STRUCTURED OUTLINE`), plus small hooks in `openBook`, `backToShelf`, `refreshFromDisk`, `switchTab`, `renderOutline`, `renderBoard`, `chapterCard`, `sideCardsUpdate`, `searchRoots` and the tab keys |
| `index.html`, `pocket/www/index.html` | Three hidden tabs and `#bible-list` |
| `styles.css` | One block at the end |
| `main.js` | Updates and the release link from `authortroy/neo-series-bible`; NEO's settings folder |
| `package.json` | Set by `scripts/series-bible-identity.js` |
| `.github/workflows/` | `follow-neo.yml` (new), `build.yml` (publishes), `pocket.yml` (by hand only) |
| `scripts/series-bible.e2e.js` | End-to-end tests (`npm run test:series-bible`; `NEO_SHOT=dir` saves screenshots) |

## Merging NEO by hand (when the daily job asks for a hand)

```
git remote add upstream https://github.com/hughhowey/neo.git   # once, if it isn't there
git fetch upstream --tags
git merge v1.6.4                       # the NEO release named in the issue
# fix the conflicts; for package.json and package-lock.json just take NEO's:
git checkout --theirs package.json package-lock.json
node scripts/series-bible-identity.js --neo 1.6.4
npm install && npm test && npm run test:series-bible
git commit -am "Merge NEO v1.6.4" && git tag v1.6.400 && git push origin main v1.6.400
```

Conflicts will be in the hooks listed above; the `SERIES BIBLE` section and the CSS block are self-contained.

## Running and building

- Try it: `npm install && npm start`
- Signed, notarized Macs build: `./build-series-bible-mac.sh` (uses `~/.series-bible-signing`, same as the Series Bible app). For your own Macs only: `./build-series-bible-mac.sh --unsigned`.
