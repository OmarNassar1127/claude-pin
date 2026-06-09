# claude-pin

> Pin Claude Code sessions so they survive the `--resume` window.

[![npm version](https://img.shields.io/npm/v/claude-pin.svg)](https://www.npmjs.com/package/claude-pin)
[![downloads](https://img.shields.io/npm/dm/claude-pin.svg)](https://www.npmjs.com/package/claude-pin)
[![license](https://img.shields.io/npm/l/claude-pin.svg)](LICENSE)

**Install:** `npm i -g claude-pin` — [view on npm](https://www.npmjs.com/package/claude-pin)

---

Claude Code only surfaces recent sessions in `claude --resume`, and transcript files are deleted after 30 days by default ([`cleanupPeriodDays`](https://code.claude.com/docs/en/settings)). If you work on something that spans weeks — a migration, a slow review, an email back-and-forth — the session you care about disappears. `claude-pin` keeps the ones you flag.

It's both a **Claude Code plugin** (adds `/pin`, `/unpin`, `/pins`, `/note` slash commands) and an **npm CLI** (`cpin` with an interactive picker). One source, two distribution channels.

---

## Table of contents

- [Quick install](#quick-install)
- [For AI assistants setting this up for a user](#for-ai-assistants-setting-this-up-for-a-user)
- [What you get](#what-you-get)
- [Slash commands](#slash-commands)
- [`cpin` CLI](#cpin-cli)
- [The interactive picker](#the-interactive-picker)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Uninstall](#uninstall)
- [Security notes](#security-notes)
- [Development](#development)

---

## Quick install

Two channels — pick one (or both):

### From npm (recommended for personal use)

```bash
npm i -g claude-pin
cpin install
cpin doctor --fix
```

You get **un-namespaced** slash commands: `/pin`, `/unpin`, `/pins`, `/note`. They're installed as **personal skills** at `~/.claude/skills/*` via symlink, so any Claude Code session sees them with no `--plugin-dir` flag.

### From the Claude Code community marketplace

```text
/plugin marketplace add anthropics/claude-plugins-community
/plugin install claude-pin@claude-community
```

You get **namespaced** slash commands: `/claude-pin:pin`, `/claude-pin:unpin`, etc. The `cpin` CLI is auto-added to the Bash tool's PATH while the plugin is enabled, but **not** to your interactive shell. To use `cpin` outside Claude Code as well, install the npm package too.

> **Requires:** Node.js 18+, Claude Code 2.1.x+ (for `${CLAUDE_SESSION_ID}` substitution).

---

## For AI assistants setting this up for a user

If you're an AI assistant (Claude, GPT, etc.) running these commands on behalf of a user, follow this exact procedure. Each step has a verification step you should run before moving on.

**Step 1 — Install from npm:**

```bash
npm i -g claude-pin
```

Verify:
```bash
which cpin && cpin help | head -1
```
Expect a path and the line `cpin — pin Claude Code sessions so they survive the resume window.`

**Step 2 — Install the slash commands:**

```bash
cpin install
```

Verify:
```bash
ls -la ~/.claude/skills/pin ~/.claude/skills/unpin ~/.claude/skills/pins ~/.claude/skills/note
```
Expect four symbolic links pointing into the claude-pin package.

**Step 3 — Bump the transcript retention so pinned files don't get auto-deleted:**

```bash
cpin doctor --fix
```

Verify:
```bash
cpin doctor
```
Look for `cleanupPeriodDays: 3650` and the green check `transcripts will survive long enough for pinning to be useful.`

**Step 4 — (Optional) Offer auto-suggest on session end:**

This is opt-in. Ask the user something like: *"Want claude-pin to nudge you to pin sessions that ran for more than 4 hours with 50+ messages? It hooks into Claude Code's Stop event and prints a one-line reminder when those sessions end."* If they say yes:

```bash
cpin install --with-auto-suggest
```

Verify:
```bash
grep -A2 suggest-pin ~/.claude/settings.json
```
Expect a Stop hook entry containing `"command": "cpin suggest-pin"`.

Thresholds are tunable via `cpin config --min-messages N --min-duration-hours N --auto-suggest on|off`. Remove the hook later with `cpin install --no-auto-suggest`.

Do **not** install the hook without asking — it modifies `~/.claude/settings.json` and changes session-end behavior.

**Step 5 — Confirm everything is wired up:**

Tell the user to open a Claude Code session and type `/pin`. If a green `✓ pinned ...` line appears, setup is complete. If they get `cpin: command not found`, run `npm bin -g` to find the global npm bin and ensure it's on PATH.

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `cpin: command not found` (slash command) | npm global bin not on PATH | `echo "export PATH=\"$(npm bin -g):$PATH\"" >> ~/.zshrc && source ~/.zshrc` |
| `Cannot find module 'claude-pin'` | Install failed mid-way | Re-run `npm i -g claude-pin` |
| `Permission denied` writing `~/.claude/skills/` | Pre-existing files | `cpin install --force` |
| `/note` on an unpinned session | (none — it now auto-pins the session, then attaches the note) | No action needed |
| Auto-suggest nudge fires too often / never | Thresholds off for this user's workflow | `cpin config --min-messages N --min-duration-hours N` |

---

## What you get

| Surface | What it does |
|---|---|
| `/pin [name]` (slash command) | Pin the current session. If no name, captures the session's title (`/rename` value or auto-title). |
| `/unpin` (slash command) | Unpin the current session. |
| `/pins` (slash command) | List pinned sessions inline in the chat. |
| `/note <text>` (slash command) | Attach a free-text note to the current pinned session. |
| `cpin` (terminal) | Interactive picker: ↑/↓ navigate (focused row's dot lights green ●), **enter resumes the focused row directly**, `/` search, `ctrl-d` unpin, `ctrl-u` undo. |
| `cpin add` (terminal) | Retroactive pinning — picker of recent sessions across **all** your projects, toggle to pin/unpin. |
| `cpin update` (terminal) | Self-update to the latest claude-pin from npm. |
| Auto-suggest on session end (opt-in) | Nudges you to pin sessions over 4h with 50+ messages, the moment they end. Enable with `cpin install --with-auto-suggest`. Configure with `cpin config`. |
| `cpin list --plain` | Static list for scripting. |
| `cpin pin/unpin/note/add/update/prune/doctor/config/install/uninstall` | Full CLI surface. |

---

## Slash commands

All four are personal skills at `~/.claude/skills/*` (when installed via npm) or namespaced under `/claude-pin:*` (when installed via marketplace).

### `/pin [name]`

Pin the current Claude Code session. The optional `[name]` is the friendly display label. If omitted, `claude-pin` falls back to the session's title — first the `custom-title` set by `/rename`, then Claude Code's auto-generated `ai-title`, then `(unnamed)`.

```
/pin
/pin migration-emails
/pin Waiting on ING reply
```

### `/unpin`

Unpins the current session. If it wasn't pinned, no-op.

### `/pins`

Prints the current pin list inline. Equivalent to running `cpin list --plain`.

### `/note <text>`

Sets (or clears, if empty) a free-text note on the current session. If the session isn't pinned yet, `/note` **pins it automatically** before attaching the note — a note is useless if its transcript gets garbage-collected. The note shows up as a `›` line under the pin in `/pins` and the `cpin` picker. Use it to record context that survives across weeks.

```
/note Waiting on legal reply about clause 4
/note Resume here after the deployment freeze ends 2026-03-05
```

> Notes are capped at 1000 characters, names at 200, both stripped of control characters.

---

## `cpin` CLI

```
cpin                       Interactive picker (↑↓ · enter resume · / search · ctrl-d unpin · ctrl-u undo · q quit)
cpin list                  Same as above; `--plain` for static output
cpin add                   Picker of recent sessions across all projects; space to toggle pin, enter to apply
cpin pin [id] --name X     Pin a session (defaults to most recent in cwd)
cpin unpin [id]            Unpin (defaults to most recent in cwd)
cpin note <id> --text X    Set/clear a free-text note on a pin
cpin prune                 Drop pins whose transcript is gone
cpin export [--out FILE]   Back up the pin store (stdout, or to FILE)
cpin import FILE [--replace] Merge pins from a backup (--replace clears first)
cpin install [--force]     Symlink /pin /unpin /pins /note into ~/.claude/skills
cpin uninstall             Remove the symlinks
cpin doctor [--fix]        Check setup; --fix bumps cleanupPeriodDays
cpin update [--check]      Update claude-pin from npm; --check just compares versions
cpin help                  Show usage
```

`cpin add` flags: `--limit N` (default 50), `--since DAYS` (default 365), `--plain` for non-interactive output.

Stdin-fed alternatives for safe shell composition: `cpin pin <id> --name-from-stdin`, `cpin note <id> --text-from-stdin`.

### Backup with `export` / `import`

```bash
cpin export --out pins-backup.json   # save your pin store (ids, names, notes, cwds)
cpin import pins-backup.json         # merge it back; dup ids are skipped
cpin import pins-backup.json --replace  # overwrite the current store instead
```

Useful for backing up before a reinstall, or moving notes between machines. **Caveat:** a pin only resumes on a machine that actually has the matching transcript at the recorded `cwd`. Across machines, treat `import` as restoring your *notes and names* — the sessions themselves resume only where the transcripts live. Run `cpin prune` afterwards to drop pins whose transcript is missing.

---

## Retroactive pinning with `cpin add`

You can pin any session, not just the current one. Run `cpin add` to open a picker of your last ~50 Claude Code sessions across every project:

```
claude-pin · add   +2 -1   showing 1–12 of 47
  ↑/↓ navigate · space: toggle · enter: apply · esc/q: cancel

   ●  Build property research & scoring agent  a25f7a17
      ~/Documents/house/agent · 2d ago
▸  ·  Research best voice models 2024          3b3b8de7
      ~/Documents/voice/chat · 7d ago
   ·  PiDash scraper debugging                 12f9aabc
      ~/Documents/PiDash · 14d ago
```

`●` = currently pinned · `·` = unpinned. Space toggles, enter applies all changes at once, esc cancels.

Session titles come from `/rename` (preferred) or Claude's auto-generated title — the same source the rest of claude-pin uses.

---

## The interactive picker

Launch with `cpin` or `cpin list`.

| Key | Action |
|---|---|
| `↑` / `↓` (or `k`/`j`) | Move focus through the list. The **focused row's dot lights up green ●** (or red ✗ if its transcript is missing); other rows show a dim `·`. The focused row's name also goes bold and the row expands with `cwd · pinned · last` plus any note and a one-line preview. |
| `enter` | **Resume the focused row immediately.** No two-stage select — focus + enter resumes. |
| `/` | Enter search mode — type to filter. Matches across name, note, cwd, **and the chat content itself**; space-separate terms to narrow (all must match). |
| `backspace` (in search) | Remove last char from filter. |
| `enter` (in search) | Resume the focused row from inside search. |
| `esc` (in search) | Clear the filter and exit search mode. |
| `ctrl-d` | Unpin the focused row (also `d`/`x` outside search). |
| `ctrl-u` | Undo the last unpin — restores it in place, notes included. Your safety net against a stray unpin. |
| `q` / `esc` | Quit. |

The list stays compact: **one line per pin** (dot, name, `✎` if it has a note, age, short id). The **focused row alone** lights its dot green ●; other healthy rows show a dim `·`. Any row whose transcript is gone shows red ✗ — health beats focus there. Only the focused row expands underneath with its full path, note, and a one-line preview of the opening message, so a long pin list stays scannable instead of becoming a wall of text. The view scrolls when there are more pins than fit, with a `3–12 of 47` counter in the header.

The picker enters the alternate screen buffer, hides your terminal cursor while open, and cleanly restores both on exit (including via SIGINT/SIGTERM). If [`fzf`](https://github.com/junegunn/fzf) is installed, an fzf-based picker is used instead.

---

## Auto-suggest on session end (opt-in)

Long sessions are the ones you most want pinned, and also the easiest to forget to pin. The Stop hook handles that: when a Claude Code session ends, claude-pin checks the transcript and prints a single-line nudge if the session was substantial — by default, **50+ messages AND 4h+ from first to last activity**. Both thresholds must be met, so the prompt stays rare.

```
› cpin: long session (73 msgs over 5h12m) — /pin to keep this thread, or cpin config --auto-suggest off to silence
```

Already-pinned sessions and short ones are silent. The hook is opt-in to keep `cpin install` non-invasive:

```bash
cpin install --with-auto-suggest    # add the Stop hook
cpin install --no-auto-suggest      # remove the Stop hook
```

It only touches a single Stop entry inside `~/.claude/settings.json` — other hooks (yours or other plugins') are preserved.

### Tuning thresholds

```bash
cpin config                              # show current settings
cpin config --min-messages 100           # quieter
cpin config --min-duration-hours 2       # louder
cpin config --auto-suggest off           # disable without removing the hook
cpin config --reset                      # back to defaults (50 msgs, 4h)
```

Settings live alongside the pin store at `~/.claude/pinned-sessions.json`.

---

## How it works

### Why sessions disappear

Claude Code stores each session as JSONL at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`. Two things cause your sessions to vanish from `claude --resume`:

1. **File deletion at 30 days**, controlled by [`cleanupPeriodDays`](https://code.claude.com/docs/en/settings). After 30 days the JSONL is gone — you can't resume what doesn't exist.
2. **Picker filtering** in `claude --resume` itself hides older sessions even before deletion. Bugs in recent versions ([#57203](https://github.com/anthropics/claude-code/issues/57203), [#14157](https://github.com/anthropics/claude-code/issues/14157)) make this more aggressive than expected.

### The leverage point

`claude --resume <session-id>` works for **any** session whose JSONL exists on disk, even if the picker hides it. `claude-pin`:

1. Bumps `cleanupPeriodDays` to 3650 via `cpin doctor --fix`, so the JSONLs stop being deleted.
2. Keeps a separate pin store at `~/.claude/pinned-sessions.json` mapping `{ id, name, cwd, note, pinned_at }`.
3. Provides a picker (`cpin`) that resumes by id directly — skipping the filter entirely.

### File layout once installed

```
~/.claude/
├── pinned-sessions.json        # the pin store
├── settings.json               # cleanupPeriodDays bumped here
├── skills/
│   ├── pin     → /path/to/claude-pin/skills/pin
│   ├── unpin   → /path/to/claude-pin/skills/unpin
│   ├── pins    → /path/to/claude-pin/skills/pins
│   └── note    → /path/to/claude-pin/skills/note
└── projects/<encoded-cwd>/<id>.jsonl   # untouched, just preserved longer
```

---

## Configuration

### `~/.claude/pinned-sessions.json`

```json
{
  "version": 1,
  "pins": [
    {
      "id": "a6909da6-2be0-4cca-af60-fc903c466e19",
      "name": "migration-emails",
      "cwd": "/Users/you/Documents/work",
      "note": "Waiting on legal reply about clause 4",
      "pinned_at": "2026-05-24T10:00:00.000Z"
    }
  ]
}
```

Honors the [`CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars) environment variable — if set, the store lives at `$CLAUDE_CONFIG_DIR/pinned-sessions.json`.

### `cleanupPeriodDays`

`cpin doctor --fix` writes `"cleanupPeriodDays": 3650` to `~/.claude/settings.json`. Set higher or lower manually if you want.

---

## Troubleshooting

**`/pin` shows `cpin: command not found`** — Slash command works, but `cpin` isn't on the Bash-tool PATH. Either:
- You installed via marketplace but didn't `npm i -g claude-pin` — install the npm package too.
- npm global bin isn't on PATH — add `$(npm bin -g)` to `~/.zshrc`.

**Picker shows `(unnamed)` even after I ran `/rename`** — Update to claude-pin 0.1.0+. The live-title lookup reads `custom-title` records from the session JSONL.

**`cpin doctor` says `cleanupPeriodDays: default (30)`** — Run `cpin doctor --fix`.

**Pin shows `✗` (red cross)** — The transcript file no longer exists. Either it was deleted before you bumped `cleanupPeriodDays`, or the cwd encoding changed. Run `cpin prune` to drop dead pins.

**The picker looks broken / leaves artifacts in my terminal** — Update to the latest version. The picker uses the alternate screen buffer and hides the cursor properly as of 0.1.0.

---

## Uninstall

Remove everything claude-pin touched:

```bash
cpin uninstall              # removes symlinks from ~/.claude/skills
npm uninstall -g claude-pin # removes the cpin CLI
```

The pin store at `~/.claude/pinned-sessions.json` is left in place (delete manually if you want). `cleanupPeriodDays` in `~/.claude/settings.json` is left at whatever value you set — Claude Code will read it as-is.

---

## Security notes

- **No third-party dependencies.** Pure Node stdlib. Zero supply-chain surface.
- **Slash command arguments are passed via single-quoted heredoc** + `--name-from-stdin` / `--text-from-stdin`. Bash heredocs with quoted delimiters don't expand the body, so injecting shell metacharacters in `/pin some "; rm -rf ~` is neutralized.
- **All session ids are UUID-validated** before being passed to `spawn('claude', ['--resume', id], ...)`. Prevents flag-confusion attacks via tampered store data. No `spawn`/`spawnSync` call uses a shell — args are always passed as an array.
- **`pin.cwd` existence is checked** before any `chdir`.
- **Names and notes are sanitized** (control characters stripped, length-capped) on every write.
- **Transcript-derived text is stripped of terminal escape sequences before display.** Titles, search text, and previews shown in the picker come from transcript content (which can include tool output, pasted text, or web-fetched text) — all C0/C1 control characters, including ESC, are removed before they reach your terminal, so a crafted transcript can't inject ANSI/terminal control sequences.
- **Atomic writes.** The pin store and the changes to `~/.claude/settings.json` are written to a temp file and renamed, so a crash mid-write can't corrupt them.

See the [SECURITY](#security-notes) section of the source for the full threat model.

---

## Development

```bash
git clone https://github.com/OmarNassar1127/claude-pin
cd claude-pin
npm link             # exposes cpin from your working copy
cpin install         # symlinks the in-development skills into ~/.claude/skills
```

Symlinks mean any edit to `skills/*/SKILL.md` or `bin/cpin` is live immediately — no `/reload-plugins`, no reinstall.

### Layout

```
claude-pin/
├── .claude-plugin/plugin.json   # plugin manifest
├── skills/
│   ├── pin/SKILL.md
│   ├── unpin/SKILL.md
│   ├── pins/SKILL.md
│   └── note/SKILL.md
├── bin/cpin                     # zero-dep Node CLI (~330 lines)
├── lib/
│   ├── store.js                 # JSON store for ~/.claude/pinned-sessions.json
│   ├── session.js               # cwd encoding, JSONL inspection
│   └── settings.js              # cleanupPeriodDays helper
├── package.json
├── LICENSE
└── README.md
```

### Validate the plugin manifest

```bash
claude plugin validate .
```

### Pull requests welcome

Especially: a fzf-bundled mode, Windows compatibility (the `which`/`spawn('claude')` calls assume Unix), and a `cpin export` / `import` for syncing pins across machines.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## License

MIT — see [LICENSE](LICENSE).
