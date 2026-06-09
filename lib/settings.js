const fs = require('fs');
const path = require('path');
const { configDir } = require('./store');

const SAFE_RETENTION_DAYS = 3650;

function settingsPath() {
  return path.join(configDir(), 'settings.json');
}

function readSettings() {
  const p = settingsPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot parse ${p}: ${err.message}`);
  }
}

function writeSettings(obj) {
  const p = settingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Atomic write — this is the user's shared Claude Code config, not just our
  // file. A crash mid-write must not corrupt it. Temp file + rename.
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

function currentRetentionDays() {
  return readSettings().cleanupPeriodDays;
}

function ensureSafeRetention() {
  const settings = readSettings();
  const current = settings.cleanupPeriodDays;
  if (typeof current === 'number' && current >= SAFE_RETENTION_DAYS) {
    return { changed: false, current };
  }
  settings.cleanupPeriodDays = SAFE_RETENTION_DAYS;
  writeSettings(settings);
  return { changed: true, previous: current, current: SAFE_RETENTION_DAYS };
}

// Manage a single Stop hook entry for claude-pin in ~/.claude/settings.json
// without clobbering other hooks the user (or other plugins) have configured.
function installStopHook(command) {
  const settings = readSettings();
  settings.hooks = settings.hooks || {};
  settings.hooks.Stop = settings.hooks.Stop || [];
  // Look for an existing claude-pin entry; replace command if found
  let found = false;
  for (const entry of settings.hooks.Stop) {
    if (Array.isArray(entry.hooks)) {
      for (const h of entry.hooks) {
        if (h && h.type === 'command' && typeof h.command === 'string' && /\bcpin\b.*\bsuggest-pin\b/.test(h.command)) {
          h.command = command;
          found = true;
        }
      }
    }
  }
  if (!found) {
    settings.hooks.Stop.push({ hooks: [{ type: 'command', command }] });
  }
  writeSettings(settings);
  return { installed: !found, alreadyPresent: found };
}

function removeStopHook() {
  const settings = readSettings();
  if (!settings.hooks || !Array.isArray(settings.hooks.Stop)) return { removed: 0 };
  let removed = 0;
  settings.hooks.Stop = settings.hooks.Stop.map(entry => {
    if (!Array.isArray(entry.hooks)) return entry;
    const before = entry.hooks.length;
    entry.hooks = entry.hooks.filter(h => !(h && h.type === 'command' && typeof h.command === 'string' && /\bcpin\b.*\bsuggest-pin\b/.test(h.command)));
    removed += before - entry.hooks.length;
    return entry;
  }).filter(entry => Array.isArray(entry.hooks) && entry.hooks.length > 0);
  if (settings.hooks.Stop.length === 0) delete settings.hooks.Stop;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  writeSettings(settings);
  return { removed };
}

module.exports = {
  settingsPath, readSettings, writeSettings,
  currentRetentionDays, ensureSafeRetention, SAFE_RETENTION_DAYS,
  installStopHook, removeStopHook,
};
