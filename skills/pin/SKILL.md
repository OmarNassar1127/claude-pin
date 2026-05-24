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

The pin output is above. Reply with a single short line confirming the pin (include the friendly name if one was set). No commentary, no next-step suggestions.
