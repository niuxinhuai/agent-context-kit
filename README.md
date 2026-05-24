# agent-context-kit

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
```

### `scan`

Prints detected repository facts:

```bash
agent-context-kit scan
agent-context-kit scan --json
```

Current detection includes:

- project name
- package manager
- framework and language hints
- build/test/lint/dev commands
- existing docs under `docs/`

### `doctor`

Checks whether AI-facing context is missing or likely incomplete:

```bash
agent-context-kit doctor
agent-context-kit doctor --json
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
