// SERIES BIBLE EDITION — end-to-end tests for the Series Bible's place in
// NEO: the Characters, Locations and Events tabs, and "Series Bible Summary
// of What You Wrote" on the outline's cards, lines and side cards, all read
// from series-bible.json in the book's folder and never written by NEO.
// Run with `npm run test:series-bible` (NEO_SHOT=dir/ also saves screenshots).

'use strict';

const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `neo-bible-test-${process.pid}-`));
app.setPath('userData', path.join(tmp, 'app'));
app.setPath('documents', tmp);
const lib = path.join(tmp, 'NEO Library');
fs.mkdirSync(lib);
fs.writeFileSync(path.join(lib, 'library.json'), JSON.stringify({
  authorName: '', penNames: [], firstRunDone: true, moreFeatures: true, pageTheme: 'paper',
  shelves: [{ id: 'shelf-1', name: 'Works in Progress', bookIds: [] }]
}));
const loadFile = BrowserWindow.prototype.loadFile;
BrowserWindow.prototype.loadFile = function (file, opts) {
  return loadFile.call(this, path.resolve(__dirname, '..', file), opts);
};
require('../main.js');

let wc;
const js = (code) => wc.executeJavaScript(code, true);
const tick = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await tick(50); } throw new Error('timed out'); };
const bookDir = () => path.join(lib, fs.readdirSync(lib).find((n) => n.startsWith('book-')));
const bibleFile = () => path.join(bookDir(), 'series-bible.json');
const clickTab = async (name) => { await js(`document.querySelector('.tab[data-tab="${name}"]').click()`); await tick(250); };
const refresh = async () => { await js('refreshFromDisk()'); await tick(400); };
const shotDir = process.env.NEO_SHOT || '';
const shot = async (name) => { if (shotDir) fs.writeFileSync(path.join(shotDir, name + '.png'), (await wc.capturePage()).toPNG()); };
const tabsShown = () => js(`['characters', 'locations', 'events'].map((k) => !document.querySelector('.tab[data-tab="' + k + '"]').hidden)`);

let ids = [];
const writeBible = (over = {}) => {
  fs.writeFileSync(bibleFile(), JSON.stringify({
    format: 'plotdude-series-bible', version: 1, app: 'Series Bible 1.3.0', updated: '2026-11-06T16:20:00Z',
    book: { title: 'The Lantern Year', series: 'Ice Roads' },
    chapters: {
      [ids[0]]: { title: 'The Thaw', summary: 'Ines finds a lantern frozen in the ice house and decides to keep it secret.', updated: '2026-11-06T16:00:00Z' },
      [ids[1]]: { title: 'Salt Road', summary: 'The convoy leaves at dawn; Ines hides the lantern in the lead truck.', updated: '2026-11-06T16:00:00Z' }
    },
    characters: [
      { name: 'Ines Varga', role: 'protagonist', description: 'A salvage driver with a long memory.', physical: 'Tall, frost-scarred hands', personality: 'Stubborn', backstory: '', relationships: 'Sister of Pol', firstAppearance: 'Chapter 1', notes: '' },
      { name: 'Pol Varga', role: 'supporting', description: 'Runs the weigh station.', physical: '', personality: '', backstory: '', relationships: '', firstAppearance: 'Chapter 3', notes: '' }
    ],
    locations: [{ name: 'The Ice House', type: 'building', description: 'Where the lantern waited.', significance: 'Opening image', firstAppearance: 'Chapter 1', notes: '' }],
    events: [
      { chapter: 'Chapter 1', title: 'The lantern is found', description: 'Ines pulls it from the ice.', characters: 'Ines', location: 'The Ice House', significance: 'Inciting incident', source: 'ai' },
      { chapter: 'Chapter 1', title: 'A promise', description: '', characters: 'Ines', location: '', significance: '', source: 'manual' },
      { chapter: 'Chapter 2', title: 'The convoy leaves', description: '', characters: 'Ines, Pol', location: 'Salt Road', significance: '', source: 'ai' }
    ],
    ...over
  }, null, 2));
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// The Series Bible app reads NEO's book folders directly (its NEO parser and
// its "NEO Library" button). If a new NEO stored books differently, that app
// would stop seeing them, so the daily NEO merge fails here and nothing is
// released until the Series Bible is updated to match.
test('a NEO book is still stored the way the Series Bible app reads it', async () => {
  const flushed = await js('flushAllSaves().then(() => true)').catch(() => true);
  assert.ok(flushed);
  await tick(800);
  const libJson = JSON.parse(fs.readFileSync(path.join(lib, 'library.json'), 'utf8'));
  assert.ok(Array.isArray(libJson.shelves), 'library.json has shelves');
  assert.ok(libJson.shelves.every((s) => typeof s.name === 'string' && Array.isArray(s.bookIds)), 'each shelf: name + bookIds');
  const dir = bookDir();
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'book.json'), 'utf8'));
  assert.equal(meta.id, path.basename(dir), 'a book folder is named by its id');
  assert.ok(libJson.shelves.some((s) => s.bookIds.includes(meta.id)), 'the book is on a shelf by its id');
  assert.equal(typeof meta.title, 'string');
  assert.ok(Array.isArray(meta.chapterOrder) && meta.chapterOrder.length >= 3, 'book.json chapterOrder');
  assert.equal(typeof meta.chapterTitles, 'object', 'book.json chapterTitles');
  assert.equal(meta.chapterTitles[ids[0]], 'The Thaw');
  assert.equal(typeof meta.wordCount, 'number', 'book.json wordCount');
  if (meta.chapterKinds !== undefined) assert.equal(typeof meta.chapterKinds, 'object');
  for (const c of meta.chapterOrder) {
    const html = fs.readFileSync(path.join(dir, 'chapters', c + '.html'), 'utf8');
    if (ids.includes(c)) assert.match(html, /<p[\s>]/, 'chapters/<id>.html holds <p> paragraphs');
  }
  // where a moved library is recorded (the Series Bible finds the library from it)
  const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(mainSrc, /settings\.libraryDir\s*=/, 'settings.json keeps libraryDir');
  assert.match(mainSrc, /'settings\.json'/, 'NEO settings file is settings.json');
});

test('a book with no series-bible.json has no bible tabs and nothing on its cards', async () => {
  assert.deepEqual(await tabsShown(), [false, false, false]);
  await clickTab('outline');
  assert.equal(await js(`document.querySelectorAll('.sb-summary').length`), 0);
  await clickTab('manuscript');
});

test('the file arriving (the Series Bible app wrote it) brings the tabs on the next look', async () => {
  writeBible();
  await refresh();
  await until(async () => (await tabsShown()).every(Boolean));
});

test('Characters: every character, the role as a chip, empty fields left out', async () => {
  await clickTab('characters');
  assert.equal(await js(`document.getElementById('aux-title').textContent`), 'Characters');
  assert.deepEqual(await js(`[...document.querySelectorAll('#bible-list .sb-name')].map((e) => e.textContent)`), ['Ines Varga', 'Pol Varga']);
  assert.deepEqual(await js(`[...document.querySelectorAll('#bible-list .sb-chip')].map((e) => e.textContent)`), ['protagonist', 'supporting']);
  const first = await js(`[...document.querySelectorAll('#bible-list .sb-entry')[0].querySelectorAll('.sb-k')].map((e) => e.textContent)`);
  assert.deepEqual(first, ['Looks', 'Personality', 'Relationships', 'First appears']);
  assert.match(await js(`document.querySelector('.sb-from').textContent`), /view only/);
  await shot('bible-characters');
});

test('Locations and Events (grouped under their chapters)', async () => {
  await clickTab('locations');
  assert.deepEqual(await js(`[...document.querySelectorAll('#bible-list .sb-name')].map((e) => e.textContent)`), ['The Ice House']);
  await clickTab('events');
  assert.deepEqual(await js(`[...document.querySelectorAll('#bible-list .sb-group')].map((e) => e.textContent)`), ['Chapter 1', 'Chapter 2']);
  assert.equal(await js(`document.querySelectorAll('#bible-list .sb-event').length`), 3);
  await shot('bible-events');
});

test('Find works on the bible tabs', async () => {
  await clickTab('characters');
  await js(`(() => { openSearch && openSearch(); const i = document.getElementById('search-input'); i.value = 'Varga'; runSearch(); })()`);
  await tick(200);
  assert.ok((await js('searchState.matches.length')) >= 2);
  await js(`document.getElementById('search-close').click()`);
});

test('the outline\'s list: the summary sits under the chapter\'s own note, labelled', async () => {
  await js(`book.chapterNotes = book.chapterNotes || {}; book.chapterNotes['${ids[0]}'] = 'AUTHOR: she keeps it secret'; library.outlineView = 'list'`);
  await clickTab('outline');
  const rows = await js(`[...document.querySelectorAll('#outline-list > *')].map((e) => e.className.split(' ')[0] + ':' + (e.dataset.chId || e.dataset.ch || ''))`);
  const at = rows.indexOf(`ol-line:${ids[0]}`);
  assert.equal(rows[at + 1], `sb-summary:${ids[0]}`);
  assert.equal(await js(`document.querySelector('.ol-bible .sb-label').textContent`), 'Series Bible Summary of What You Wrote');
  assert.equal(await js(`document.querySelector('.ol-line.ol-chapter[data-ch-id="${ids[0]}"] .ol-text').textContent`), 'AUTHOR: she keeps it secret');
  assert.equal(await js(`document.querySelectorAll('.ol-bible').length`), 2, 'chapter 3 has no summary yet');
  await shot('bible-outline-list');
});

test('the outline\'s cards: on the chapter card, under the note; opening the card edits only the note', async () => {
  await js(`library.outlineView = 'cards'`);
  await clickTab('manuscript');
  await clickTab('outline');
  const sel = `.ob-cell[data-kind="chapter"][data-ch="${ids[0]}"]`;
  assert.match(await js(`document.querySelector('${sel} .ob-bible').textContent`), /Ines finds a lantern/);
  assert.equal(await js(`document.querySelector('${sel} .ob-text').textContent`), 'AUTHOR: she keeps it secret');
  assert.equal(await js(`!!document.querySelector('.ob-cell[data-kind="chapter"][data-ch="${ids[2]}"] .ob-bible')`), false);
  await shot('bible-outline-cards');
  await js(`openCard(document.querySelector('${sel}'))`);
  await tick(150);
  await shot('bible-outline-card-open');
  wc.insertText(' — and lies about it');
  await tick(80);
  await js('closeCardEditor()');
  await tick(150);
  assert.equal(await js(`book.chapterNotes['${ids[0]}']`), 'AUTHOR: she keeps it secret — and lies about it');
  assert.match(await js(`document.querySelector('${sel} .ob-bible').textContent`), /Ines finds a lantern/, 'still on the card');
});

test('saving the book never puts the summary in book.json, and NEO never writes series-bible.json', async () => {
  const before = fs.readFileSync(bibleFile(), 'utf8');
  await js('flushAllSaves()');
  await tick(1200);
  const meta = fs.readFileSync(path.join(bookDir(), 'book.json'), 'utf8');
  assert.match(meta, /and lies about it/);
  assert.doesNotMatch(meta, /Ines finds a lantern/);
  assert.equal(fs.readFileSync(bibleFile(), 'utf8'), before);
  assert.deepEqual(fs.readdirSync(bookDir()).filter((f) => f.startsWith('series-bible')), ['series-bible.json']);
});

test('the side card beside the page carries the chapter\'s summary', async () => {
  await clickTab('manuscript');
  await js(`(() => {
    const p = document.querySelector('.chapter[data-id="${ids[1]}"] .chapter-body p');
    const r = document.createRange(); r.setStart(p.firstChild, 2); r.collapse(true);
    getSelection().removeAllRanges(); getSelection().addRange(r); currentChapterId = '${ids[1]}';
    sideCardsUpdate(true);
  })()`);
  await tick(150);
  assert.match(await js(`(document.querySelector('#side-cards .side-card-bible') || {}).textContent || ''`), /hides the lantern/);
});

test('a new summary from the Series Bible shows on the next look, without a reopen', async () => {
  const j = JSON.parse(fs.readFileSync(bibleFile(), 'utf8'));
  j.chapters[ids[2]] = { title: 'The Weigh Station', summary: 'Pol weighs the truck and notices the extra kilo.', updated: '2026-11-06T17:00:00Z' };
  j.updated = '2026-11-06T17:00:00Z';
  fs.writeFileSync(bibleFile(), JSON.stringify(j));
  await clickTab('outline');
  await refresh();
  await until(() => js(`!!document.querySelector('.ob-cell[data-kind="chapter"][data-ch="${ids[2]}"] .ob-bible')`));
});

test('closed on Characters, the book opens on Characters again', async () => {
  await clickTab('characters');
  const bookId = await js('book.id');
  await js('backToShelf()');
  await tick(300);
  assert.deepEqual(await tabsShown(), [false, false, false], 'no bible on the shelf');
  await js(`openBook('${bookId}')`);
  await until(() => js(`currentTab === 'characters'`));
  assert.equal(await js(`document.querySelectorAll('#bible-list .sb-entry').length`), 2);
});

test('the file going away takes the tabs and summaries with it (and leaves its tab)', async () => {
  fs.unlinkSync(bibleFile());
  await refresh();
  await until(async () => (await tabsShown()).every((v) => !v));
  assert.equal(await js('currentTab'), 'manuscript');
  await clickTab('outline');
  // (what's on screen: the hidden list keeps its last drawing until it's shown again)
  assert.equal(await js(`document.querySelectorAll('#outline-board .sb-summary, #side-cards .sb-summary').length`), 0);
  assert.equal(await js(`book.chapterNotes['${ids[0]}']`), 'AUTHOR: she keeps it secret — and lies about it');
});

test('a file that isn\'t the Series Bible\'s (or is broken) is ignored', async () => {
  fs.writeFileSync(bibleFile(), JSON.stringify({ format: 'something-else', characters: [{ name: 'X' }] }));
  await refresh();
  assert.deepEqual(await tabsShown(), [false, false, false]);
  fs.writeFileSync(bibleFile(), '{ "format": "plotdude-series-bible", ');
  await refresh();
  assert.deepEqual(await tabsShown(), [false, false, false]);
});

test('night page: the tabs read on dark paper', async () => {
  writeBible();
  await refresh();
  await until(async () => (await tabsShown()).every(Boolean));
  await js(`library.pageTheme = 'night'; applyLook && applyLook()`).catch(() => {});
  await js(`document.body.classList.add('night')`);
  await clickTab('characters');
  await shot('bible-characters-night');
  await clickTab('outline');
  await js(`library.outlineView = 'list'; renderOutline()`);
  await shot('bible-outline-list-night');
});

async function main() {
  await app.whenReady();
  let failed = 0;
  try {
    let win;
    while (!(win = BrowserWindow.getAllWindows()[0])) await tick(50);
    wc = win.webContents;
    win.setSize(1280, 860);
    while (!(await js(`typeof library !== 'undefined' && !!library`).catch(() => false))) await tick(50);
    await tick(300);
    await js(`(async () => {
      document.getElementById('firstrun').hidden = true;
      const paras = (s) => Array.from({ length: 6 }, () => ({ text: s }));
      await addImportedBooks([{ name: 'The Lantern Year', chapters: [
        { title: 'The Thaw', paras: paras('Ines found the lantern in the ice house.') },
        { title: 'Salt Road', paras: paras('The convoy left at dawn.') },
        { title: 'The Weigh Station', paras: paras('The scale was older than the road.') }
      ] }], library.shelves[0]);
      const ids = library.shelves[0].bookIds;
      await openBook(ids[ids.length - 1]);
    })()`);
    await tick(400);
    ids = await js(`book.chapterOrder.filter((c) => isStory(c))`);
    win.focus();
    for (const t of tests) {
      try {
        await t.fn();
        console.log('ok   ' + t.name);
      } catch (err) {
        failed++;
        console.log('FAIL ' + t.name + '\n     ' + String(err.message).replace(/\n/g, '\n     '));
      }
    }
    console.log(`\n${tests.length - failed} passed, ${failed} failed`);
  } catch (err) {
    failed++;
    console.error(err);
  } finally {
    app.exit(failed ? 1 : 0);
  }
}
main();
