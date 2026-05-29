const fs = require('fs');
const path = require('path');
const { configDir } = require('./store');

function encodeCwd(cwd) {
  return cwd.replace(/\//g, '-');
}

function decodeCwd(encoded) {
  return encoded.replace(/-/g, '/');
}

function projectsDir() {
  return path.join(configDir(), 'projects');
}

function projectDirFor(cwd) {
  return path.join(projectsDir(), encodeCwd(cwd));
}

function sessionFilePath(cwd, sessionId) {
  return path.join(projectDirFor(cwd), `${sessionId}.jsonl`);
}

function sessionExists(cwd, sessionId) {
  return fs.existsSync(sessionFilePath(cwd, sessionId));
}

function listSessionFiles(cwd) {
  const dir = projectDirFor(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      return { id: f.replace(/\.jsonl$/, ''), mtime: stat.mtimeMs, path: full };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function mostRecentSessionId(cwd) {
  const files = listSessionFiles(cwd);
  return files.length ? files[0].id : null;
}

// Existence-only lookup: returns the transcript path or null without reading it.
// Cheap — use for boolean checks. Use findAnySessionFile when you need the cwd.
function findAnySessionPath(sessionId) {
  const root = projectsDir();
  if (!fs.existsSync(root)) return null;
  for (const proj of fs.readdirSync(root)) {
    const candidate = path.join(root, proj, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function findAnySessionFile(sessionId) {
  const candidate = findAnySessionPath(sessionId);
  if (!candidate) return null;
  // The encoded directory name is lossy (every "/" became "-", indistinguishable
  // from a literal "-" in the path), so we cannot recover the real cwd from it.
  // Read the authoritative cwd out of the transcript itself; decode only as a fallback.
  const info = readSessionInfo(candidate);
  const proj = path.basename(path.dirname(candidate));
  return { path: candidate, cwd: info.cwd || decodeCwd(proj) };
}

// Single-pass reader: title + real cwd + searchable text from one file read.
function readSessionInfo(filePath) {
  const empty = { customTitle: null, aiTitle: null, cwd: null, gitBranch: null, searchText: '' };
  if (!filePath || !fs.existsSync(filePath)) return empty;
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return empty; }
  let customTitle = null;
  let aiTitle = null;
  let cwd = null;
  let gitBranch = null;
  const texts = [];
  for (const line of content.split('\n')) {
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!cwd && typeof obj.cwd === 'string') cwd = obj.cwd;
    if (typeof obj.gitBranch === 'string' && obj.gitBranch) gitBranch = obj.gitBranch; // last seen wins
    if (obj.type === 'custom-title' && typeof obj.customTitle === 'string') customTitle = obj.customTitle;
    else if (obj.type === 'ai-title' && typeof obj.aiTitle === 'string') aiTitle = obj.aiTitle;
    else if ((obj.type === 'user' || obj.type === 'assistant') && obj.message && texts.length < 60) {
      const c = obj.message.content;
      if (typeof c === 'string') texts.push(c);
      else if (Array.isArray(c)) {
        for (const b of c) if (b && b.type === 'text' && typeof b.text === 'string') texts.push(b.text);
      }
    }
  }
  const searchText = texts.join(' ').replace(/\s+/g, ' ').slice(0, 4000);
  return { customTitle, aiTitle, cwd, gitBranch, searchText };
}

function readSessionTitle(filePath) {
  const info = readSessionInfo(filePath);
  return info.customTitle || info.aiTitle || null;
}

function liveTitle(pin) {
  return readSessionTitle(sessionFilePath(pin.cwd, pin.id));
}

function lastActivity(pin) {
  const filePath = sessionFilePath(pin.cwd, pin.id);
  if (!fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).mtimeMs;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function listAllRecentSessions({ limit = 50, daysBack = 365 } = {}) {
  const root = projectsDir();
  if (!fs.existsSync(root)) return [];
  const cutoff = Date.now() - daysBack * 86400 * 1000;
  const candidates = [];
  for (const proj of fs.readdirSync(root)) {
    const projDir = path.join(root, proj);
    let stat;
    try { stat = fs.statSync(projDir); } catch { continue; }
    if (!stat.isDirectory()) continue;
    let files;
    try { files = fs.readdirSync(projDir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const id = f.replace(/\.jsonl$/, '');
      if (!UUID_PATTERN.test(id)) continue;
      const full = path.join(projDir, f);
      let fileStat;
      try { fileStat = fs.statSync(full); } catch { continue; }
      if (fileStat.mtimeMs < cutoff) continue;
      candidates.push({ id, proj, path: full, mtimeMs: fileStat.mtimeMs });
    }
  }
  // Sort by recency and read content for the top N only — reading every transcript
  // within the window (then discarding most) was the bulk of `cpin add`'s cost.
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates.slice(0, limit).map(it => {
    const info = readSessionInfo(it.path);
    return {
      id: it.id,
      cwd: info.cwd || decodeCwd(it.proj),
      path: it.path,
      mtimeMs: it.mtimeMs,
      title: info.customTitle || info.aiTitle || null,
      searchText: info.searchText,
    };
  });
}

function readSummary(sessionFilePath) {
  if (!fs.existsSync(sessionFilePath)) return null;
  const fd = fs.openSync(sessionFilePath, 'r');
  const buf = Buffer.alloc(8192);
  const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const text = buf.slice(0, bytesRead).toString('utf8');
  const firstNewline = text.indexOf('\n');
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
  try {
    const obj = JSON.parse(firstLine);
    const msg = obj?.message?.content;
    if (typeof msg === 'string') return msg.slice(0, 80).replace(/\s+/g, ' ');
    if (Array.isArray(msg)) {
      const t = msg.find(b => b?.type === 'text')?.text;
      if (t) return t.slice(0, 80).replace(/\s+/g, ' ');
    }
    if (typeof obj?.summary === 'string') return obj.summary.slice(0, 80);
  } catch { /* not a parseable JSON line */ }
  return null;
}

module.exports = {
  encodeCwd,
  decodeCwd,
  projectsDir,
  projectDirFor,
  sessionFilePath,
  sessionExists,
  listSessionFiles,
  mostRecentSessionId,
  findAnySessionPath,
  findAnySessionFile,
  readSessionInfo,
  readSessionTitle,
  liveTitle,
  lastActivity,
  listAllRecentSessions,
  readSummary,
};
