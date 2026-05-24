---
description: Add a free-text note to the current pinned session. Use when the user wants to record context, a pending action, or a reminder about what they're working on. Requires the session to already be pinned with /pin.
disable-model-invocation: true
allowed-tools: Bash(cpin:*)
argument-hint: "[note text]"
---

```!
cpin note "${CLAUDE_SESSION_ID}" --text-from-stdin <<'CPIN_ARG_END_2c4f8a'
$ARGUMENTS
CPIN_ARG_END_2c4f8a
```

Reply with one short line confirming the note. No commentary.
