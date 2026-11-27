# herdr-agents-subagents

A [Herdr](https://herdr.dev) mod: the Agents list of the sidebar, plus the
Claude Code sub-agents each Claude session is running, nested under it with
their description and model.

![Agents with sub-agents](preview.png)

## Install

It has two parts: the mod, and a Claude Code `SessionStart` hook that tells
Herdr where each session keeps its sub-agents.

1. Ask your agent in Herdr:

   > Read ~/.config/herdr-app/AGENTS.md, then add this mod: herdr.dev/mods/ausema/herdr-agents-subagents

   Then put `agents-subagents` in your layout's Agents panel in place of
   `agents`.

2. Install the hook (needs `jq`):

   ```sh
   mkdir -p ~/.claude/hooks
   cp claude-code/hooks/herdr-label-claude-session ~/.claude/hooks/
   chmod +x ~/.claude/hooks/herdr-label-claude-session
   ```

   and add it to `~/.claude/settings.json`:

   ```json
   {
     "hooks": {
       "SessionStart": [
         { "hooks": [{ "type": "command", "command": "~/.claude/hooks/herdr-label-claude-session", "timeout": 5 }] }
       ]
     }
   }
   ```

   Sessions started after that show their sub-agents.

What it touches: the hook runs `herdr-core label` on the session's own
terminal. The mod runs `find` every 3 s and reads the `agent-*.meta.json`
files in the session folders under `~/.claude/projects/`. No network calls.

## Develop

```sh
(cd mods/agents-subagents && node --test test/*.test.js)
bash claude-code/hooks/tests/herdr-label-claude-session.test.sh
```

See [RECIPE.md](RECIPE.md) for how it looks and behaves.
