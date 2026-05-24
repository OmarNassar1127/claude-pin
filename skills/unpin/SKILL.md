---
description: Unpin the current Claude Code session. Use when the user asks to unpin, unbookmark, or unfavorite this session.
disable-model-invocation: true
allowed-tools: Bash(cpin:*)
---

!`cpin unpin "${CLAUDE_SESSION_ID}"`

Reply with a single short line confirming. No commentary.
