'use strict';
// Zero-dep tests using the built-in node:test runner. Run with `npm test` (node --test).
// These lock in the 0.4.0/0.5.0 fixes: real-cwd extraction, re-pin merge (no note/name
// loss), /note auto-pin, and export/import round-trips.

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CLI = path.join(__dirname, '..', 'bin', 'cpin');
const session = require('../lib/session');

const ID1 = '11111111-2222-3333-4444-555555555555';
const ID2 = '99999999-8888-7777-6666-555555555555';
const ID3 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// Fresh, isolated config dir per call so tests never touch the real store.
function makeEnv() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cpin-test-'));
  // Real cwd contains a hyphen — the exact case the lossy dir-name decode got wrong.
  const realCwd = path.join(tmp, 'my-proj');
  fs.mkdirSync(realCwd, { recursive: true });
  const projDir = path.join(tmp, 'projects', realCwd.replace(/\//g, '-'));
  fs.mkdirSync(projDir, { recursive: true });
  return { tmp, realCwd, projDir };
}

function writeSession(projDir, id, cwd, { title = 'Test Title', user = 'searchable phrase here' } = {}) {
  const lines = [
    JSON.stringify({ type: 'user', cwd, message: { role: 'user', content: user } }),
    JSON.stringify({ type: 'ai-title', aiTitle: title }),
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'an assistant reply' }] } }),
  ];
  fs.writeFileSync(path.join(projDir, `${id}.jsonl`), lines.join('\n') + '\n');
}

function cpin(tmp, args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp, NO_COLOR: '1' },
    encoding: 'utf8',
  });
}

function readStore(tmp) {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'pinned-sessions.json'), 'utf8'));
}

test('readSessionInfo reads the real cwd from the transcript, not the lossy dir name', () => {
  const { projDir, realCwd } = makeEnv();
  const file = path.join(projDir, `${ID1}.jsonl`);
  writeSession(projDir, ID1, realCwd);
  const info = session.readSessionInfo(file);
  assert.strictEqual(info.cwd, realCwd);
  // Decoding the dir name would mangle the hyphen — prove we did NOT rely on it.
  const decodedDirName = path.basename(projDir).replace(/-/g, '/');
  assert.notStrictEqual(decodedDirName, realCwd);
  assert.strictEqual(info.aiTitle, 'Test Title');
  assert.match(info.searchText, /searchable phrase/);
});

test('re-pinning does not wipe an existing note or name', () => {
  const { tmp, projDir, realCwd } = makeEnv();
  writeSession(projDir, ID1, realCwd);
  cpin(tmp, ['pin', ID1, '--name', 'keep-me']);
  cpin(tmp, ['note', ID1, '--text', 'important note']);
  const out = cpin(tmp, ['pin', ID1]); // bare re-pin, no args
  assert.match(out, /already pinned/);
  const pin = readStore(tmp).pins.find(p => p.id === ID1);
  assert.strictEqual(pin.note, 'important note');
  assert.strictEqual(pin.name, 'keep-me');
  assert.strictEqual(pin.cwd, realCwd);
});

test('/note on an unpinned session auto-pins it', () => {
  const { tmp, projDir, realCwd } = makeEnv();
  writeSession(projDir, ID2, realCwd);
  const out = cpin(tmp, ['note', ID2, '--text', 'auto pinned note']);
  assert.match(out, /pinned & noted/);
  const store = readStore(tmp);
  assert.strictEqual(store.pins.length, 1);
  assert.strictEqual(store.pins[0].id, ID2);
  assert.strictEqual(store.pins[0].note, 'auto pinned note');
});

test('export then import round-trips the pin store', () => {
  const { tmp, projDir, realCwd } = makeEnv();
  writeSession(projDir, ID1, realCwd);
  cpin(tmp, ['pin', ID1, '--name', 'first']);

  const exported = cpin(tmp, ['export']);
  const parsed = JSON.parse(exported);
  assert.strictEqual(parsed.pins.length, 1);

  // Import a backup containing one new pin + the existing one (dup should be skipped).
  const backup = path.join(tmp, 'backup.json');
  fs.writeFileSync(backup, JSON.stringify({
    version: 1,
    pins: [
      { id: ID1, name: 'dup', cwd: realCwd, note: null, pinned_at: '2026-01-01T00:00:00.000Z' },
      { id: ID3, name: 'imported', cwd: realCwd, note: 'from backup', pinned_at: '2026-01-02T00:00:00.000Z' },
    ],
  }));
  const out = cpin(tmp, ['import', backup]);
  assert.match(out, /imported 1 pin/);
  const ids = readStore(tmp).pins.map(p => p.id).sort();
  assert.deepStrictEqual(ids, [ID1, ID3].sort());
});

test('import rejects entries with a non-UUID id', () => {
  const { tmp } = makeEnv();
  const backup = path.join(tmp, 'bad.json');
  fs.writeFileSync(backup, JSON.stringify({ pins: [{ id: 'not-a-uuid', name: 'x' }] }));
  const out = cpin(tmp, ['import', backup]);
  assert.match(out, /bad id/);
  // Store should remain empty (file may not even exist if nothing was added).
  const storeFile = path.join(tmp, 'pinned-sessions.json');
  const pins = fs.existsSync(storeFile) ? readStore(tmp).pins : [];
  assert.strictEqual(pins.length, 0);
});
