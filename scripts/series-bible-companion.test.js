// SERIES BIBLE EDITION: the companion module (series-bible-companion.js).
// Each app's "I'm installed" file, and when this build says the Series Bible
// app has an update too. No network, no dialogs.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-sb-companion-'));
process.env.PLOTDUDE_BRIDGE_DIR = tmp;
const c = require('../series-bible-companion.js');

const feed = (version, ok = true) => async () => ({ ok, text: async () => `version: ${version}\nfiles:\n  - url: x.zip\npath: x.zip\n` });
const installed = (version, extra = {}) => fs.writeFileSync(path.join(tmp, 'installed-series-bible.json'),
  JSON.stringify({ format: 'plotdude-installed', app: 'series-bible', version, path: tmp, ...extra }));
const mac = process.platform === 'darwin' || process.platform === 'win32';

test('this build leaves its own "installed" file, naming the .app on a Mac', () => {
  assert.equal(c.appBundle('/Applications/NEO Series Bible.app/Contents/MacOS/NEO Series Bible'), '/Applications/NEO Series Bible.app');
  assert.equal(c.appBundle('C:\\Programs\\NEO Series Bible\\NEO Series Bible.exe'), 'C:\\Programs\\NEO Series Bible\\NEO Series Bible.exe');
  assert.ok(c.writeInstalled('1.6.601', '/Applications/NEO Series Bible.app/Contents/MacOS/NEO Series Bible'));
  const j = JSON.parse(fs.readFileSync(path.join(tmp, 'installed-neo-series-bible.json'), 'utf8'));
  assert.equal(j.format, 'plotdude-installed');
  assert.equal(j.app, 'neo-series-bible');
  assert.equal(j.version, '1.6.601');
  assert.equal(j.path, '/Applications/NEO Series Bible.app');
});

test('no Series Bible file: nothing to compare, nothing said', async () => {
  assert.equal(c.readSeriesBible(), null);
  assert.deepEqual(await c.seriesBibleUpdate({ fetchFn: feed('9.9.9') }), { behind: false });
});

test('a file that is not ours, or whose app has gone, counts as not installed', () => {
  fs.writeFileSync(path.join(tmp, 'installed-series-bible.json'), JSON.stringify({ version: '1.5.1' }));
  assert.equal(c.readSeriesBible(), null);
  installed('1.5.1', { path: path.join(tmp, 'gone.app') });
  assert.equal(c.readSeriesBible(), null);
  installed('1.5.1');
  assert.deepEqual(c.readSeriesBible(), { version: '1.5.1', path: tmp });
  assert.ok(c.seriesBiblePresent());
});

test('versions compare by number, not by letter', () => {
  assert.ok(c.compareVersions('1.10.0', '1.9.9') > 0);
  assert.ok(c.compareVersions('1.5.1', '1.5.10') < 0);
  assert.equal(c.compareVersions('1.5.1', '1.5.1'), 0);
});

test('behind only when the feed is newer; offline or a bad feed says nothing', { skip: !mac && 'the Series Bible app has no update feed on this platform' }, async () => {
  installed('1.5.1');
  assert.equal(await c.latestSeriesBible(feed('1.6.0')), '1.6.0');
  const u = await c.seriesBibleUpdate({ fetchFn: feed('1.6.0') });
  assert.deepEqual(u, { behind: true, installed: '1.5.1', latest: '1.6.0', path: tmp });
  assert.equal((await c.seriesBibleUpdate({ fetchFn: feed('1.5.1') })).behind, false);
  assert.equal((await c.seriesBibleUpdate({ fetchFn: feed('1.5.0') })).behind, false);
  assert.equal((await c.seriesBibleUpdate({ fetchFn: feed('1.6.0', false) })).behind, false);
  assert.equal((await c.seriesBibleUpdate({ fetchFn: async () => ({ ok: true, text: async () => '<html>not a feed</html>' }) })).behind, false);
});

test('a version already mentioned is not mentioned again, unless asked', { skip: !mac && 'no feed on this platform' }, async () => {
  installed('1.5.1');
  fs.writeFileSync(path.join(tmp, 'neo-series-bible-state.json'), JSON.stringify({ toldAbout: '1.6.0' }));
  assert.equal((await c.seriesBibleUpdate({ fetchFn: feed('1.6.0') })).behind, false);
  assert.equal((await c.seriesBibleUpdate({ fetchFn: feed('1.6.0'), again: true })).behind, true);
  assert.equal((await c.seriesBibleUpdate({ fetchFn: feed('1.6.1') })).behind, true, 'a newer one is news again');
});

test('the links: NEO goes to Hugh, the Series Bible to The Plot Abides', () => {
  assert.match(c.LINKS.neo, /github\.com\/hughhowey\/neo/);
  assert.match(c.LINKS.help, /^https:\/\/theplotabides\.com\//);
  assert.match(c.LINKS.app, /^https:\/\/theplotabides\.com\//);
});
