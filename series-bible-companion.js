// SERIES BIBLE EDITION: what ties NEO Series Bible to its companion, The
// Plot Dude's Series Bible app. Kept in a file of its own so a merge of a
// new NEO release never touches it. main.js calls start() once NEO is up.
//
//  - Each app leaves a small "I'm installed" file beside the bridge file
//    (never in iCloud): its version and where it lives. This build writes
//    installed-neo-series-bible.json and reads installed-series-bible.json
//    (written by Series Bible 1.5.1 and later).
//  - Update notices cover both apps. Each app updates itself; when this one
//    sees that the Series Bible app has a newer version than the copy on
//    this computer, it says so (once per version) and offers to open it,
//    which is all that app needs to update itself. The Series Bible app
//    does the same for this one.
//  - A one-time note for a new user who doesn't have the Series Bible app
//    yet: the tabs stay hidden until that app has scanned a book.
//  - The links behind Help → Help with the Series Bible, and About.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const LINKS = {
  // the install guide and help for this edition (The Plot Abides)
  help: 'https://theplotabides.com/tools/neo-series-bible/',
  // the Series Bible app itself
  app: 'https://theplotabides.com/tools/series-bible-updater/',
  // NEO is Hugh Howey's: its home, its help, its issues
  neo: 'https://github.com/hughhowey/neo'
};
// where the Series Bible app's own updater looks (its package.json → build.publish)
const SERIES_BIBLE_FEED = 'https://files.theplotabides.com/series-bible/updates/';
const INSTALLED_FORMAT = 'plotdude-installed';
const CHECK_EVERY = 6 * 60 * 60 * 1000;

// the folder both apps share for their small files (same rule as main.js seriesBibleBridge)
function sharedDir() {
  const home = os.homedir();
  return process.env.PLOTDUDE_BRIDGE_DIR
    || (process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support', 'PlotDude')
      : process.platform === 'win32' ? path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'PlotDude')
        : path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'PlotDude'));
}

const readJSON = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
function writeJSON(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
    fs.renameSync(file + '.tmp', file);
    return true;
  } catch { return false; }
}

// On a Mac the thing to open is the .app, not the program inside it
function appBundle(exe) {
  const m = /^(.*?\.app)\/Contents\/MacOS\//.exec(exe || '');
  return m ? m[1] : exe;
}

/** This build's "I'm installed" file, refreshed at every launch. */
function writeInstalled(version, exe) {
  return writeJSON(path.join(sharedDir(), 'installed-neo-series-bible.json'), {
    format: INSTALLED_FORMAT, app: 'neo-series-bible', name: 'NEO Series Bible',
    version, path: appBundle(exe), platform: process.platform, at: new Date().toISOString()
  });
}

/** The Series Bible app's file: { version, path }, or null (not installed, older than 1.5.1, or moved away). */
function readSeriesBible() {
  const j = readJSON(path.join(sharedDir(), 'installed-series-bible.json'));
  if (!j || j.format !== INSTALLED_FORMAT || typeof j.version !== 'string') return null;
  if (j.path && !fs.existsSync(j.path)) return null; // uninstalled since
  return { version: j.version, path: j.path || '' };
}

/** Is the Series Bible app on this computer at all (any version)? */
function seriesBiblePresent() {
  if (readSeriesBible()) return true;
  if (fs.existsSync(path.join(sharedDir(), 'series-bible-bridge.json'))) return true; // it has run here
  if (process.platform === 'darwin') {
    const name = "The Plot Dude's Series Bible.app";
    return fs.existsSync(path.join('/Applications', name)) || fs.existsSync(path.join(os.homedir(), 'Applications', name));
  }
  return false;
}

const stateFile = () => path.join(sharedDir(), 'neo-series-bible-state.json');
const readState = () => readJSON(stateFile()) || {};
const saveState = (patch) => writeJSON(stateFile(), { ...readState(), ...patch });

function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/** The newest Series Bible app version on offer for this platform, or '' (offline, or no feed for it). */
async function latestSeriesBible(fetchFn = fetch) {
  const file = process.platform === 'darwin' ? 'latest-mac.yml' : process.platform === 'win32' ? 'latest.yml' : '';
  if (!file) return '';
  const res = await fetchFn(SERIES_BIBLE_FEED + file, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return '';
  const m = /^version:\s*['"]?([0-9][0-9A-Za-z.+-]*)['"]?\s*$/m.exec(await res.text());
  return m ? m[1] : '';
}

/**
 * Is the Series Bible app on this computer behind what's on offer?
 * → { behind, installed, latest, path }. `again` asks even if this version
 * was already mentioned (Help → Check for Update…).
 */
async function seriesBibleUpdate({ again = false, fetchFn } = {}) {
  const here = readSeriesBible();
  if (!here) return { behind: false };
  const latest = await latestSeriesBible(fetchFn);
  if (!latest || compareVersions(latest, here.version) <= 0) return { behind: false, installed: here.version, latest };
  if (!again && readState().toldAbout === latest) return { behind: false, installed: here.version, latest, told: true };
  return { behind: true, installed: here.version, latest, path: here.path };
}

/**
 * main.js calls this once NEO is up.
 * deps: { app, dialog, shell, ipcMain, t, logError, getWindow }
 */
function start(deps) {
  const { app, dialog, shell, ipcMain, t, logError, getWindow } = deps;

  // the links behind the Help menu and About (the page asks by name; it can't pass a URL)
  ipcMain.handle('seriesBible:link', (_e, key) => {
    if (!Object.prototype.hasOwnProperty.call(LINKS, key)) return false;
    shell.openExternal(LINKS[key]);
    return true;
  });

  // a test (or `npm start`) has no installed copy to speak for
  if (!app.isPackaged && !process.env.NEO_SB_COMPANION) return;

  writeInstalled(app.getVersion(), app.getPath('exe'));

  let asking = false;
  const ask = async (opts) => {
    const win = getWindow();
    return win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts);
  };

  // New here, and no Series Bible app: say what the extra tabs need (once)
  const welcome = async () => {
    if (asking || readState().welcomed || seriesBiblePresent()) return;
    asking = true;
    try {
      saveState({ welcomed: true });
      const r = await ask({
        type: 'info',
        message: t('Welcome to NEO Series Bible'),
        detail: [
          t('This is NEO, Hugh Howey’s word processor for authors, with The Plot Dude’s Series Bible built in.'),
          t('Everything in NEO works as it always does. The Characters, Locations, Events and Ask tabs appear on a book once the Series Bible app has scanned it. That app builds the bible; NEO shows it.'),
          t('You can find both again under Help.')
        ].join('\n\n'),
        buttons: [t('Get the Series Bible App'), t('OK')],
        defaultId: 1,
        cancelId: 1
      });
      if (r.response === 0) shell.openExternal(LINKS.app);
    } catch (err) { logError('series bible welcome', err); } finally { asking = false; }
  };

  // The other half of "update both": the Series Bible app has a newer version
  const companion = async (again) => {
    if (asking) return;
    try {
      const u = await seriesBibleUpdate({ again });
      if (!u.behind) return;
      asking = true;
      saveState({ toldAbout: u.latest });
      const r = await ask({
        type: 'info',
        message: t('The Series Bible app has an update too'),
        detail: [
          t('Series Bible {latest} is available; this computer has {installed}.', { latest: u.latest, installed: u.installed }),
          t('NEO Series Bible and the Series Bible app update separately, and work best when both are current. Open the Series Bible app and it downloads its update by itself.')
        ].join('\n\n'),
        buttons: [t('Open the Series Bible App'), t('Later')],
        defaultId: 0,
        cancelId: 1
      });
      if (r.response === 0 && u.path) shell.openPath(u.path);
    } catch (err) { logError('series bible companion', err); } finally { asking = false; }
  };

  setTimeout(() => { welcome(); }, 6000).unref?.();
  setTimeout(() => { companion(false); }, 20000).unref?.();
  setInterval(() => { companion(false); }, CHECK_EVERY).unref?.();
  // Help → Check for Update… looks at both apps
  module.exports.checkNow = () => companion(true);
}

module.exports = {
  LINKS, start, checkNow: () => {},
  // for the tests
  sharedDir, writeInstalled, readSeriesBible, seriesBiblePresent, latestSeriesBible, seriesBibleUpdate, compareVersions, appBundle
};
