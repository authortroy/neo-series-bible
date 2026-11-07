#!/usr/bin/env node
// SERIES BIBLE EDITION: puts this fork's identity on package.json (and the
// version on package-lock.json). Run after every merge of a new NEO release,
// since NEO's own version bumps rewrite those lines.
//
//   node scripts/series-bible-identity.js            keep the NEO version, keep the revision
//   node scripts/series-bible-identity.js --neo 1.6.4   a new NEO release: revision back to 0
//   node scripts/series-bible-identity.js --bump        a fix of ours on the same NEO
//
// The version: NEO's major.minor, and NEO's patch × 100 + our revision.
// NEO 1.6.3 → 1.6.300; our next fix → 1.6.301; NEO 1.6.4 → 1.6.400. Always
// newer than what came before, so the updater offers every release.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RELEASES = { provider: 'github', owner: 'authortroy', repo: 'neo-series-bible' };
// The package name sets the updater's download cache ("<name>-updater"):
// its own, so plain NEO's downloads and this one's never meet.
const NAME = 'neo-series-bible';

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const write = (f, d) => fs.writeFileSync(path.join(ROOT, f), JSON.stringify(d, null, 2) + '\n');

function forkVersion(neo, rev) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(neo);
  if (!m) throw new Error(`NEO version "${neo}" isn't major.minor.patch`);
  if (rev < 0 || rev > 99) throw new Error(`revision ${rev} is out of 0–99`);
  return `${m[1]}.${m[2]}.${Number(m[3]) * 100 + rev}`;
}

function main(argv) {
  const pkg = read('package.json');
  const sb = pkg.seriesBible || {};
  let neo = sb.neoVersion || pkg.version;
  let rev = Number.isInteger(sb.revision) ? sb.revision : 0;

  const at = argv.indexOf('--neo');
  if (at >= 0) {
    const next = String(argv[at + 1] || '').replace(/^v/, '');
    if (next !== neo) { neo = next; rev = 0; }
  }
  if (argv.includes('--bump')) rev += 1;

  const version = forkVersion(neo, rev);
  pkg.name = NAME;
  pkg.version = version;
  pkg.productName = 'NEO Series Bible';
  pkg.description = "NEO, Hugh Howey's word processor for authors, with The Plot Dude's Series Bible built in.";
  pkg.seriesBible = { neoVersion: neo, revision: rev };
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['test:series-bible'] = 'electron scripts/series-bible.e2e.js';
  pkg.build = pkg.build || {};
  pkg.build.appId = 'com.plotdude.neo-seriesbible';
  pkg.build.productName = 'NEO Series Bible';
  pkg.build.publish = [RELEASES];
  // Installer names without spaces: GitHub turns a space in an uploaded name
  // into a dot, and the updater looks for the exact name in latest*.yml, so a
  // spaced name ("NEO Series Bible-…") is one it could never download.
  pkg.build.artifactName = 'NEO-Series-Bible-${version}-${arch}.${ext}';
  pkg.build.nsis = { ...(pkg.build.nsis || {}), artifactName: 'NEO-Series-Bible-Setup-${version}.${ext}' };
  pkg.build.portable = { ...(pkg.build.portable || {}), artifactName: 'NEO-Series-Bible-${version}-portable.${ext}' };
  write('package.json', pkg);

  const lockFile = path.join(ROOT, 'package-lock.json');
  if (fs.existsSync(lockFile)) {
    const lock = read('package-lock.json');
    lock.name = NAME;
    lock.version = version;
    if (lock.packages && lock.packages['']) Object.assign(lock.packages[''], { name: NAME, version });
    write('package-lock.json', lock);
  }
  console.log(`NEO Series Bible ${version} (NEO ${neo}, revision ${rev})`);
  return version;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { forkVersion, main };
