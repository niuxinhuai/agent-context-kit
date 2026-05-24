<!-- agent-context-kit:start -->
# Codex Instructions

This file gives Codex the repository context needed before editing code.

## Repository

- Project: agent-context-kit
- Stack: Node.js
- Primary package manager: npm
- Test command: npm test


## Node Preset

- Use the package manager detected from lockfiles or `package.json`.
- Keep `node_modules/`, `dist/`, and `coverage/` out of Git unless explicitly required.
- Prefer existing `package.json` scripts for build, test, lint, and dev workflows.


## Working Rules

- Read `AGENTS.md` when it exists.
- Prefer existing project patterns over new abstractions.
- Keep edits scoped to the requested behavior.
- Run the smallest meaningful verification command before handing off.
- Do not commit secrets, local environment files, build artifacts, or generated files unless explicitly requested.
<!-- agent-context-kit:end -->
