---
description: Add a free-text note to the current session to record context, a pending action, or a reminder about what they're working on. If the session isn't pinned yet, it is pinned automatically so the note survives.
disable-model-invocation: true
allowed-tools: Bash(cpin:*)
argument-hint: "[note text]"
---

```!
cpin note "${CLAUDE_SESSION_ID}" --text-from-stdin <<'CPIN_ARG_END_2c4f8a'
$ARGUMENTS
CPIN_ARG_END_2c4f8a
```

The output is above. Reply with one short line: if it shows "pinned & noted", mention the session was pinned and the note saved; otherwise just confirm the note. No commentary.
