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
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
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

module.exports = { settingsPath, readSettings, currentRetentionDays, ensureSafeRetention, SAFE_RETENTION_DAYS };
