# agent-context-kit

[![CI](https://github.com/niuxinhuai/agent-context-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/niuxinhuai/agent-context-kit/actions/workflows/ci.yml)

Make your repository understandable to AI coding agents in 60 seconds.

`agent-context-kit` generates and maintains the context files that tools like Codex, Claude Code, Cursor, and other AI coding agents need before they safely edit a codebase.

## Why

Most repositories have implicit rules:

- which package manager to use
- which generated files must not be edited
- how modules are owned
- which docs matter for a task
- how to verify a change
- what must be updated when public behavior changes

Humans learn this over time. AI agents need it up front.

## Install

```bash
npm install -g agent-context-kit
```

Or run without installing:

```bash
npx agent-context-kit init
```

## Usage

```bash
agent-context-kit init
agent-context-kit scan
agent-context-kit doctor
agent-context-kit explain
agent-context-kit report
agent-context-kit update
```

### `init`

Generates:

- `AGENTS.md`
- `docs/README.md`

It will not overwrite existing files unless `--force` is passed.

```bash
agent-context-kit init
agent-context-kit init --force
agent-context-kit init --dry-run
agent-context-kit init --target claude
agent-context-kit init --target cursor
agent-context-kit init --target codex
agent-context-kit init --target all
```

Targets:

- `agents`: `AGENTS.md` and `docs/README.md`
- `claude`: `CLAUDE.md`
- `cursor`: `.cursor/rules/agent-context.mdc`
- `codex`: `.codex/AGENTS.md`
- `all`: every supported target

### `scan`

Prints detected repository facts:

```bash
agent-context-kit scan
agent-context-kit scan --json
```

Current detection includes:

- project name
- primary package manager and additional package managers
- framework and language hints
- build/test/lint/dev commands
- existing docs under `docs/`

### `doctor`

Checks whether AI-facing context is missing or likely incomplete:

```bash
agent-context-kit doctor
agent-context-kit doctor --json
agent-context-kit doctor --strict
```

Current checks include missing context files, missing or stale npm scripts in docs, local absolute paths in AI instructions, and risky files already tracked by Git such as `.env`, `*.pem`, `*.key`, `node_modules/`, `dist/`, `coverage/`, and `.DS_Store`.

Use `--strict` in CI when warnings should fail the job.

### `explain`

Prints a concise summary for humans and AI agents:

```bash
agent-context-kit explain
agent-context-kit explain --json
```

### `report`

Prints a copyable repository context report for issues, pull requests, and AI conversations:

```bash
agent-context-kit report
agent-context-kit report --json
```

### `update`

Regenerates managed sections in context files:

```bash
agent-context-kit update
agent-context-kit update --dry-run
```

Generated files are wrapped in managed markers:

```md
<!-- agent-context-kit:start -->
generated content
<!-- agent-context-kit:end -->
```

`update` replaces only that block and preserves manual notes before or after it. If it sees an older generated file without markers, it migrates it to the managed block format.

## Example

```bash
cd my-repo
npx agent-context-kit init
git diff
```

Then edit the generated files to add project-specific rules that cannot be inferred automatically.

## Roadmap

- Detect monorepos and package workspaces.
- Preserve hand-written sections during updates.
- Add templates for `CLAUDE.md`, Cursor rules, and Codex instructions.
- Add rule checks for generated directories, lockfiles, binary artifacts, and secrets.
- Add `explain` output for onboarding new contributors.

## Development

```bash
npm test
npm run lint
```

This project intentionally starts with zero runtime dependencies.

## License

MIT
