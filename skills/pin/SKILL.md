---
description: Pin the current Claude Code session so it survives the resume window. Use when the user asks to pin, bookmark, star, or favorite this session.
disable-model-invocation: true
allowed-tools: Bash(cpin:*)
argument-hint: "[name]"
---

```!
cpin pin "${CLAUDE_SESSION_ID}" --name-from-stdin <<'CPIN_ARG_END_2c4f8a'
$ARGUMENTS
CPIN_ARG_END_2c4f8a
```

The pin output is above. Relay it in a single short line, matching what actually happened: if it shows "already pinned", tell the user it was already pinned (don't imply you just pinned it now); if "pinned" or "updated", confirm that. Include the friendly name if one was set. No commentary, no next-step suggestions.
