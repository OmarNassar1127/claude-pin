# Privacy

`claude-pin` is a local-only tool. It does **not** collect, transmit, or share any data with the author, Anthropic, npm, or any third party.

## What `claude-pin` reads

- `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` — your Claude Code session transcripts, **only the JSONL files for sessions you explicitly pin**. The reads are local file reads; nothing leaves your machine.
- `~/.claude/settings.json` — to detect and (when you opt in via `cpin doctor --fix`) modify the `cleanupPeriodDays` setting.

## What `claude-pin` writes

- `~/.claude/pinned-sessions.json` — your pin list. Contains the pin id, friendly name, working directory, optional note, and pin timestamp. Plain JSON, never transmitted.
- `~/.claude/skills/{pin,unpin,pins,note}` — symbolic links into the installed `claude-pin` package directory, created by `cpin install`. These are Claude Code slash command definitions, not data.
- `~/.claude/settings.json` — when you run `cpin doctor --fix`, the `cleanupPeriodDays` value is updated. No other settings are touched.

## What `claude-pin` sends

Nothing. The package has zero network code. It has zero third-party dependencies (pure Node standard library), so no transitive telemetry. You can verify this in [`package.json`](package.json) — the `dependencies` field is absent.

## Uninstalling

Remove the symbolic links and the npm package:

```bash
cpin uninstall
npm uninstall -g claude-pin
```

The pin store at `~/.claude/pinned-sessions.json` is left in place — delete it manually if you want.

## Contact

Questions about privacy or this policy: omar.portero.nassar1@gmail.com or file an issue at https://github.com/OmarNassar1127/claude-pin/issues.

_Last updated: 2026-05-24._
