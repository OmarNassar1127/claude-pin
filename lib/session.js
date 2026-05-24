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

function findAnySessionFile(sessionId) {
  const root = projectsDir();
  if (!fs.existsSync(root)) return null;
  for (const proj of fs.readdirSync(root)) {
    const candidate = path.join(root, proj, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) {
      return { path: candidate, cwd: decodeCwd(proj) };
    }
  }
  return null;
}

function readSessionTitle(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  let customTitle = null;
  let aiTitle = null;
  for (const line of content.split('\n')) {
    if (!line || !line.includes('-title')) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'custom-title' && typeof obj.customTitle === 'string') customTitle = obj.customTitle;
      else if (obj.type === 'ai-title' && typeof obj.aiTitle === 'string') aiTitle = obj.aiTitle;
    } catch { /* skip malformed lines */ }
  }
  return customTitle || aiTitle || null;
}

function liveTitle(pin) {
  return readSessionTitle(sessionFilePath(pin.cwd, pin.id));
}

function lastActivity(pin) {
  const filePath = sessionFilePath(pin.cwd, pin.id);
  if (!fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).mtimeMs;
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
  findAnySessionFile,
  readSessionTitle,
  liveTitle,
  lastActivity,
  readSummary,
};
