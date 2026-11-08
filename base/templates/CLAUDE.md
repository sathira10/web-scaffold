@AGENTS.md

## Claude

- Clear context between tasks. Start each task from its plan, not from memory of an earlier
  session.
- Review a diff in a fresh session (or a subagent) with `/code-review`, never in the session
  that wrote it.
- Check a reported bug before acting on it. Agents often report bugs that aren't bugs.
