const fs = require('fs');
const path = require('path');
const os = require('os');

function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function storePath() {
  return path.join(configDir(), 'pinned-sessions.json');
}

function load() {
  const p = storePath();
  if (!fs.existsSync(p)) return { version: 1, pins: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!parsed.pins) return { version: 1, pins: [] };
    return parsed;
  } catch (err) {
    throw new Error(`pinned-sessions.json is corrupt at ${p}: ${err.message}`);
  }
}

function save(data) {
  const p = storePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Atomic write: a crash mid-write must never leave a truncated/corrupt store.
  // Write to a pid-scoped temp file, then rename (atomic on the same filesystem).
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

function findById(data, id) {
  return data.pins.find(p => p.id === id);
}

function add(pin) {
  const data = load();
  const existing = findById(data, pin.id);
  if (existing) {
    Object.assign(existing, pin);
  } else {
    data.pins.push(pin);
  }
  save(data);
  return data;
}

function remove(id) {
  const data = load();
  const before = data.pins.length;
  data.pins = data.pins.filter(p => p.id !== id);
  save(data);
  return before - data.pins.length;
}

function list() {
  return load().pins;
}

module.exports = { load, save, add, remove, list, findById, storePath, configDir };
