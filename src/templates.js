export function renderAgentsMd(scan) {
  const stack = scan.stack.length ? scan.stack.join(" / ") : "not detected yet";
  const packageManagers = scan.packageManagers?.length ? scan.packageManagers.join(", ") : "not detected";
  const docs = scan.docs.length
    ? scan.docs.map((doc) => `- \`docs/${doc}\``).join("\n")
    : "- No existing docs were detected. Start with `docs/README.md`.";
  const presetGuidance = renderPresetGuidance(scan.preset);

  return `# AGENTS.md

This file is the first stop for AI coding agents working in this repository.

## Project Identity

- Project: ${scan.name}
- Repository root: current working directory
- Detected stack: ${stack}
- Primary package manager: ${scan.primaryPackageManager ?? scan.packageManager ?? "not detected"}
- Package managers: ${packageManagers}

## Start Here

1. Read this file.
2. Read \`docs/README.md\` for the documentation index.
3. Inspect only the files relevant to the current task.
4. Prefer existing project patterns over new abstractions.

## Common Commands

- Install: ${installCommand(scan.packageManager)}
- Build: ${scan.commands.build ?? "not detected; document this when known"}
- Test: ${scan.commands.test ?? "not detected; document this when known"}
- Lint: ${scan.commands.lint ?? "not detected; document this when known"}
- Dev server: ${scan.commands.dev ?? "not detected; document this when known"}

## Documentation Index

${docs}
${presetGuidance}

## Do Not

- Do not edit generated files unless the task explicitly says to update the generator.
- Do not add dependencies before checking the existing package manifest.
- Do not make broad refactors while fixing a narrow bug.
- Do not commit secrets, local environment files, build artifacts, or large binaries unless the repository explicitly tracks them.

## Change Checklist

- Confirm the owning module or package before editing.
- Keep changes scoped to the requested behavior.
- Update docs when public commands, setup steps, architecture, or extension points change.
- Run the smallest meaningful verification command before handing off.
`;
}

export function renderClaudeMd(scan) {
  return renderAgentInstructions(scan, "CLAUDE.md", "Claude Code");
}

export function renderCodexMd(scan) {
  return renderAgentInstructions(scan, "Codex Instructions", "Codex");
}

export function renderCursorRules(scan) {
  return `---
description: AI coding agent context for ${scan.name}
alwaysApply: true
---

${renderAgentInstructions(scan, "Cursor Agent Context", "Cursor").trimEnd()}
`;
}

export function renderDocsReadme(scan) {
  const docs = scan.docs.filter((doc) => doc !== "README.md");
  const docList = docs.length
    ? docs.map((doc) => `| \`docs/${doc}\` | Existing documentation. |`).join("\n")
    : "| _none yet_ | Add topic docs as the project grows. |";

  return `# Documentation

This directory is the human and AI documentation index for \`${scan.name}\`.

## Quick Start

| Need | Read |
| --- | --- |
| AI agent instructions | \`AGENTS.md\` |
| Repository overview | this file |
| Setup commands | \`AGENTS.md\` until a dedicated setup doc exists |

## Existing Docs

| Document | Purpose |
| --- | --- |
${docList}

## Maintenance Rules

- Add new docs to this index when they become part of the normal workflow.
- Keep command examples current with the package manifest.
- Prefer task-focused docs over long catch-all documents.
`;
}

function installCommand(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn install";
    case "bun":
      return "bun install";
    case "npm":
      return "npm install";
    case "ohpm":
      return "ohpm install";
    case "flutter":
      return "flutter pub get";
    case "cargo":
      return "cargo fetch";
    case "go":
      return "go mod download";
    case "python":
      return "pip install -e .";
    default:
      return "not detected; document this when known";
  }
}

function renderAgentInstructions(scan, title, agentName) {
  const presetGuidance = renderPresetGuidance(scan.preset);

  return `# ${title}

This file gives ${agentName} the repository context needed before editing code.

## Repository

- Project: ${scan.name}
- Stack: ${scan.stack.length ? scan.stack.join(" / ") : "not detected yet"}
- Primary package manager: ${scan.primaryPackageManager ?? scan.packageManager ?? "not detected"}
- Test command: ${scan.commands.test ?? "not detected; document this when known"}
${presetGuidance}

## Working Rules

- Read \`AGENTS.md\` when it exists.
- Prefer existing project patterns over new abstractions.
- Keep edits scoped to the requested behavior.
- Run the smallest meaningful verification command before handing off.
- Do not commit secrets, local environment files, build artifacts, or generated files unless explicitly requested.
`;
}

function renderPresetGuidance(preset) {
  switch (preset) {
    case "node":
      return `

## Node Preset

- Use the package manager detected from lockfiles or \`package.json\`.
- Keep \`node_modules/\`, \`dist/\`, and \`coverage/\` out of Git unless explicitly required.
- Prefer existing \`package.json\` scripts for build, test, lint, and dev workflows.
`;
    case "python":
      return `

## Python Preset

- Keep virtual environments such as \`.venv/\` out of Git.
- Prefer \`pytest\` for tests when available.
- Prefer \`ruff\` for linting and formatting when available.
- Treat \`pyproject.toml\` as the source of package and tooling configuration.
`;
    case "harmony":
      return `

## HarmonyOS Preset

- Use \`ohpm\` for package management.
- Do not commit \`oh-package-lock.json5\` unless this repository explicitly tracks it.
- Do not manually edit \`entry/src/main/ets/generated/\`.
- New ArkUI pages should include route annotations when the app router requires them.
`;
    case "flutter":
      return `

## Flutter Preset

- Use \`flutter pub get\` after dependency changes.
- Keep generated build output out of Git.
- Use existing \`pubspec.yaml\` scripts, assets, and platform directory conventions.
- If \`build_runner\` is used, document the generation command before changing generated files.
`;
    default:
      return "";
  }
}
