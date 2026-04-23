# SignalCanvas Claude Code Skills

Claude Code skills for SignalCanvas development. Install these so Claude follows consistent conventions across all contributors.

## Install

```bash
git clone https://github.com/ByteBard97/signalcanvas-skills ~/.claude/skills/signalcanvas
```

Claude Code picks up skills from `~/.claude/skills/` automatically.

## Skills

| Skill | When to use |
|-------|-------------|
| `vue-best-practices` | Any `.vue` file, composable, or Pinia store in any Vue 3 project |
| `patchlang` | Writing, editing, or validating `.patch` files |
| `code-rules` | Any code task — enforces file size, DRY, naming, and error handling rules |
| `rig-builder` | Building or importing a rig into SignalCanvas — from conversation, CSV/XLSX patch lists, or screenshots of Visio/handwritten diagrams |

## Usage

Invoke a skill explicitly for best results:

```
Use vue-best-practices skill. Add a settings panel to CanvasToolbar.
```

Or Claude will pick them up automatically based on the task context.

## Contributing

Edit the `SKILL.md` in any skill directory. The `vue-best-practices` skill is based on [vuejs-ai/skills](https://github.com/vuejs-ai/skills).
