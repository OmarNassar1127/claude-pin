# Changelog

All notable changes to claude-pin are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## 0.7.7 — 2026-06-09

### Security

- **`sanitize()` (names/notes) now uses the same control-char policy as transcript-derived text.** Two gaps from a security audit of 0.7.6: user-supplied names and notes kept newlines (a multi-line note could spoof extra rows in `cpin list --plain` output) and the C1 range `0x80–0x9f` (single-byte CSI `0x9b` is still interpreted by some terminals). `sanitize()` now delegates to the same `stripControl` used for live transcript text — C0+C1 stripped, whitespace collapsed to one line. Low severity (the input is typed by the user themselves), fixed for consistency and defense in depth. Regression tests added for both.

## 0.7.6 — 2026-05-29

### Security

- **Strip terminal escape sequences from transcript-derived text before display.** The picker shows session titles, search text, and previews read live from transcripts. Transcript content is untrusted (tool output, pasted text, web-fetched text) and can carry raw ANSI/terminal escape sequences. All C0/C1 control characters (including ESC `0x1b`) are now removed before these strings reach the terminal, closing a terminal-escape-injection vector. The existing `sanitize()` only covered names/notes at write time; this covers the live-read display path too.

### Changed

- **Atomic writes for the pin store and `~/.claude/settings.json`.** Both are now written to a pid-scoped temp file and `rename`d into place, so a crash mid-write can't leave a truncated/corrupt file. Matters most for `settings.json`, which is the user's shared Claude Code config, not just claude-pin's own file.

## 0.7.5 — 2026-05-29

### Changed

- **Picker hint line is now readable.** Was dim grey end-to-end ("hard to read" — fair). Now the keys (`↑/↓`, `enter`, `/`, `ctrl-d`, `q`, `ctrl-u`) pop in **cyan**, the labels (`navigate`, `resume`, etc.) render in normal text, and only the `·` separators stay dim. Visual hierarchy: keys first, what-they-do second, separators last. The `ctrl-u undo` slot still dims when no undo is available and lights yellow when one is.

## 0.7.4 — 2026-05-29

### Fixed

- **`enter` inside `/` search now resumes directly** instead of just closing the search box. Previously you had to press `enter` once to exit search, then `enter` again to resume — two presses for one action. Now: type to filter, arrow to a row (or skip the arrow to grab the top match), press `enter` once, you're in. Matches the behavior the README already promised since 0.7.2 — code now does what the docs said.

## 0.7.3 — 2026-05-29

### Changed

- **Picker focus indicator is now the dot itself, not a `▸` arrow.** The focused row's dot lights up **green ●** (or **red ✗** if its transcript is missing); every other healthy row shows a dim `·`. The previous "always green ● for every healthy row" made the focused row indistinguishable from the rest after 0.7.2 dropped the two-stage select. Single visual signal now, no leading arrow column — the list is one column narrower.
- Expanded detail under the focused row (cwd/note/preview) re-indented to align cleanly with the new no-arrow layout.

## 0.7.2 — 2026-05-29

### Changed

- **`cpin` picker resumes on a single `enter`.** Dropped the previous two-stage `space → enter` flow — focus a row with `↑/↓` and press `enter` to resume it directly. Faster for the common case, and the picker now matches the muscle memory you have for `claude --resume`'s built-in picker. Inside `/` search, `enter` resumes the focused row too (was previously "apply filter then enter again to resume").
- **The dot is now purely a transcript-health indicator** — green `●` if the JSONL is on disk, red `✗` if not. Focus is shown by `▸` + bold name, which it already was. Removes the (now unused) green dot for "selected."

### Removed

- The `space` key binding inside `cpin` (was: select / deselect for the two-stage flow).

## 0.7.1 — 2026-05-29

### Docs

- README "For AI assistants" section now includes the opt-in auto-suggest step (Step 4) so LLM helpers reading the README know to offer `cpin install --with-auto-suggest` after asking the user. Also adds a troubleshooting row for tuning thresholds.

## 0.7.0 — 2026-05-29

### Added

- **Auto-suggest on session end.** A Stop hook that nudges you to pin sessions that meet a length threshold the moment they end. Defaults: 50+ messages **and** 4h+ duration (both required, so the prompt stays rare). Prints a one-line note to stderr — `› cpin: long session (73 msgs over 5h12m) — /pin to keep this thread`. Already-pinned and below-threshold sessions are silent.
- **`cpin config`** — view or change auto-suggest thresholds. Flags: `--min-messages N`, `--min-duration-hours N`, `--auto-suggest on|off`, `--reset`. Settings live alongside the pin store in `~/.claude/pinned-sessions.json`.
- **`cpin suggest-pin`** — internal command invoked by the Stop hook. Reads `{session_id, transcript_path}` JSON from stdin and decides whether to print the nudge. Safe to call by hand (silent on empty stdin).

### Changed

- **`cpin install`** now accepts `--with-auto-suggest` to install the Stop hook in `~/.claude/settings.json` (opt-in to keep `cpin install` non-invasive), and `--no-auto-suggest` to remove a previously installed hook. The install only touches the claude-pin entry — other Stop hooks (yours or other plugins') are preserved.
- **`cpin uninstall`** now also removes the Stop hook entry.

## 0.6.1 — 2026-05-29

### Changed

- **Reverted the picker to the compact list layout** (one line per pin, focused row expands with cwd/note/preview, `/` to search). The `claude --resume`-style search box from 0.6.0 didn't earn its keep.
- **Kept the `ctrl-d` (unpin) / `ctrl-u` (undo) keybindings** from 0.6.0 — they now work everywhere, including while searching. `d`/`x`/`u` still work outside search.

## 0.6.0 — 2026-05-29

### Changed

- **Picker redesigned to match `claude --resume`.** A title with your position, an always-on search box (just type — no `/` to enter search), and one entry per pin showing the name then a `time · branch · size` meta line (`✎` marks pins with a note). The git branch is read from the transcript and the size is the transcript file size. Only the focused row expands with its note + content preview, and the view scrolls with a `1 of 43` position counter.

### Keybindings

- Type anywhere to filter (search is always on). `↑`/`↓` (or `ctrl-p`/`ctrl-n`) move, `enter` resumes the focused row directly.
- Unpin moved to **`ctrl-d`** and undo to **`ctrl-u`** (letters now go to the search box). `esc` clears the search or quits when empty; `ctrl-c` always quits. `q` and `/` are no longer special.

## 0.5.1 — 2026-05-29

### Changed

- **Compact picker layout.** The list now shows one line per pin (name, a `✎` marker if it has a note, age, short id) and expands only the focused row to its full path, note, and preview. Long pin lists stay scannable instead of becoming a wall of text. The view scrolls when pins exceed the terminal height, with a `3–12 of 47` counter; a red `✗` flags pins whose transcript is gone.
- **Stable `u: undo` hint.** The undo affordance is always shown in the footer legend (dim), lit yellow only when an undo is available, so the hint line no longer shifts as pins come and go.

## 0.5.0 — 2026-05-29

### Added

- **Content preview in the picker.** The focused row now shows a one-line snippet of the session's opening message, so you can tell pins apart without resuming them.
- **Undo unpin (`u`).** Pressing `d` no longer loses a pin for good — `u` restores the last unpinned session in place, note and all. The picker also stays open after the final unpin so you can undo it.
- **`cpin export` / `cpin import`.** Back up the pin store to stdout or a file and merge it back (`--replace` to overwrite). Cross-machine, treat it as restoring notes/names — a pin only resumes where its transcript actually lives.
- **Test suite.** Zero-dep `node --test` coverage (`npm test`) for cwd extraction, the re-pin merge, `/note` auto-pin, and export/import round-trips.

### Fixed

- **Arrow keys work while searching.** In `/` search you can now move the focus with ↑/↓ without pressing enter first; arrow escape sequences no longer leak into the query.

## 0.4.0 — 2026-05-29

### Fixed

- **Re-pinning no longer wipes your note or name.** `/pin` (or `cpin pin`) on an already-pinned session used to overwrite `note`/`name` with empty values. It now only changes a field when you explicitly pass a new value, and reports `↺ already pinned` when nothing changed.
- **Correct cwd resolution.** The project directory name is a lossy encoding of the path (every `/` becomes `-`, indistinguishable from a literal `-`), so paths like `~/Desktop/vloto-dashboard` were decoded wrongly and broke resume. The real `cwd` is now read from the transcript itself. Legacy pins with a bad cwd are self-healed on the next resume.

### Added

- **Content-aware search in the picker.** `/` search now matches against the chat content, not just name/note/cwd. Space-separate terms to narrow (all must match). Zero new dependencies — it reads the transcripts you already have.
- **`/note` auto-pins.** Adding a note to an unpinned session now pins it first, then attaches the note, instead of erroring.

### Changed

- **Faster picker.** Title lookups, existence checks, and search text are now computed once per session on open instead of re-reading every transcript on every keypress — removes the lag with many pins. `cpin add` now reads only the most-recent N transcripts instead of every transcript in the window.

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
