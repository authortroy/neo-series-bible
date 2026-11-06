# NEO Series Bible

This is Hugh Howey's NEO (MIT license) with The Plot Dude's Series Bible built in. It is a fork, kept as a branch (`series-bible`) on top of NEO's own history so new NEO releases can be merged in.

## What it adds

- **Characters, Locations and Events tabs** after Darlings, for any book whose folder holds a `series-bible.json`. They are view only; the bible is edited in the Series Bible app. Find (⌘F) searches them.
- **"Series Bible Summary of What You Wrote"** on each chapter that has an AI summary: on its outline card (short label "Series Bible" while the card is closed, the full label when it is open), under its line in the outline's List view, and on the chapter's card in the pane beside the page. It sits under the writer's own note and never changes it.
- NEO never writes `series-bible.json`. It reads it when a book opens and on every refresh (window focus, and every 30 seconds), so new summaries appear without reopening the book.

## Its own app

- App id `com.plotdude.neo-seriesbible`, name **NEO Series Bible**. It does not update itself from NEO's GitHub releases, so plain NEO can never replace it. Help → Check for Update still says when a newer NEO is out (time to merge it in).
- It uses NEO's settings folder, so it opens the same library. NEO's single-instance lock then keeps NEO and NEO Series Bible from having the library open at the same time.

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
| `main.js` | `SERIES_BIBLE_EDITION`: no self-update; NEO's settings folder |
| `package.json` | Name, app id, no GitHub publish, `test:series-bible` |
| `scripts/series-bible.e2e.js` | End-to-end tests (`npm run test:series-bible`; `NEO_SHOT=dir` saves screenshots) |
| `scripts/updater-portable.test.js` | Updated for "never updates from NEO's releases" |

## Bringing in a new NEO release

```
git remote add upstream https://github.com/hughhowey/neo.git   # once
git fetch upstream
git merge upstream/main
npm install && npm test && npm run test:series-bible
```

Conflicts, when there are any, will be in the hooks listed above; the `SERIES BIBLE` section and the CSS block are self-contained.

## Running and building

- Try it: `npm install && npm start`
- Signed, notarized Macs build: `./build-series-bible-mac.sh` (uses `~/.series-bible-signing`, same as the Series Bible app). For your own Macs only: `./build-series-bible-mac.sh --unsigned`.
