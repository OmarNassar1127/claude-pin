# Changelog

All notable changes to claude-pin are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## 0.3.0 — 2026-05-24

### Added

- **`cpin add`** — interactive picker over your last ~50 Claude Code sessions across all projects. Space toggles pin/unpin, enter applies all changes. Solves the "I should have pinned that chat 3 weeks ago" problem. Flags: `--limit N`, `--since DAYS`, `--plain`.
- **`cpin update [--check]`** — self-update to the latest claude-pin from npm. Detects and refuses to run over a `npm link` dev install (suggests `git pull` instead). `--check` only compares versions, does not install.

## 0.2.1 — 2026-05-24

### Fixed

- `cpin` no longer hangs when resuming a pin whose original project directory has been deleted. Now prints a clear message with two remediation options (recreate the dir or drop the pin), since `claude --resume` requires the original cwd.

## 0.2.0 — 2026-05-24

### Added

- **`/note <text>`** slash command — attach a free-text note to the currently pinned session. Notes are sanitized (control characters stripped, capped at 1000 chars).
- **Search inside the picker** — press `/` while in `cpin` to filter by title, note, or cwd. Esc clears, enter applies.
- **Two-stage selection in picker** — arrow keys move focus, space commits the selection (green ● appears), enter resumes. Removes the "looks pre-selected on open" issue.
- **Live session titles** — picker now displays `/rename`'s custom-title or Claude's auto ai-title in real time, not the snapshot taken at pin time.
- **Last-activity timestamp** — each pin shows both `pinned Xd ago` and `last Yh ago` for at-a-glance freshness.

### Changed

- Picker now uses the alternate screen buffer and hides the cursor — no more bleed into terminal history on exit. Rendering is now in-place (no full-screen clear per keypress) for smooth navigation.
- `/pin` arguments pass via single-quoted heredoc + `--name-from-stdin`, neutralizing shell injection through `$ARGUMENTS`.

### Security

- All session ids are UUID-validated before being passed to `spawn('claude', ['--resume', ...])` — prevents flag-confusion attacks from tampered store data.
- `pin.cwd` existence is checked before `chdir`.
- Names and notes sanitized (control characters stripped, length capped) on every write.

## 0.1.0 — 2026-05-24

### Added

- Initial release.
- `/pin [name]`, `/unpin`, `/pins` slash commands installable via `cpin install`.
- `cpin` CLI with interactive picker (fzf if available, no-dep Node TUI fallback).
- `cpin pin`, `cpin unpin`, `cpin list`, `cpin prune`, `cpin doctor`, `cpin install`, `cpin uninstall`.
- JSON store at `~/.claude/pinned-sessions.json` (honors `CLAUDE_CONFIG_DIR`).
- `cpin doctor --fix` bumps `cleanupPeriodDays` to 3650 so transcript files stop being auto-deleted.
- Zero third-party dependencies.
- MIT license.
