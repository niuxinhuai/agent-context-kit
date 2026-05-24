export function renderAgentsMd(scan) {
  const stack = scan.stack.length ? scan.stack.join(" / ") : "not detected yet";
  const docs = scan.docs.length
    ? scan.docs.map((doc) => `- \`docs/${doc}\``).join("\n")
    : "- No existing docs were detected. Start with `docs/README.md`.";

  return `# AGENTS.md

This file is the first stop for AI coding agents working in this repository.

## Project Identity

- Project: ${scan.name}
- Repository root: current working directory
- Detected stack: ${stack}
- Package manager: ${scan.packageManager ?? "not detected"}

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
