import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { generateRepositoryContext } from "../src/generator.js";

async function createRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ackit-"));
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "demo",
      scripts: {
        test: "node --test"
      }
    }),
    "utf8"
  );
  return root;
}

test("init writes managed blocks to generated context files", async () => {
  const root = await createRepo();

  try {
    await generateRepositoryContext(root, { mode: "init" });

    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
    const docsReadme = await readFile(path.join(root, "docs", "README.md"), "utf8");

    assert.match(agents, /<!-- agent-context-kit:start -->/);
    assert.match(agents, /<!-- agent-context-kit:end -->/);
    assert.match(docsReadme, /<!-- agent-context-kit:start -->/);
    assert.match(docsReadme, /<!-- agent-context-kit:end -->/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("update replaces only the managed block and preserves manual text", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "AGENTS.md"),
      [
        "# Team Notes",
        "",
        "Keep this paragraph.",
        "",
        "<!-- agent-context-kit:start -->",
        "old generated content",
        "<!-- agent-context-kit:end -->",
        "",
        "Keep this footer."
      ].join("\n"),
      "utf8"
    );
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(
      path.join(root, "docs", "README.md"),
      [
        "# Docs",
        "",
        "Manual introduction.",
        "",
        "<!-- agent-context-kit:start -->",
        "old generated docs",
        "<!-- agent-context-kit:end -->"
      ].join("\n"),
      "utf8"
    );

    await generateRepositoryContext(root, { mode: "update" });

    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
    const docsReadme = await readFile(path.join(root, "docs", "README.md"), "utf8");

    assert.match(agents, /Keep this paragraph\./);
    assert.match(agents, /Keep this footer\./);
    assert.doesNotMatch(agents, /old generated content/);
    assert.match(agents, /Project: demo/);

    assert.match(docsReadme, /Manual introduction\./);
    assert.doesNotMatch(docsReadme, /old generated docs/);
    assert.match(docsReadme, /Repository overview/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("update migrates legacy generated files without duplicating content", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "AGENTS.md"),
      [
        "# AGENTS.md",
        "",
        "This file is the first stop for AI coding agents working in this repository.",
        "",
        "## Project Identity",
        "",
        "- Project: demo"
      ].join("\n"),
      "utf8"
    );

    await generateRepositoryContext(root, { mode: "update" });

    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
    const titleMatches = agents.match(/# AGENTS\.md/g) ?? [];

    assert.equal(titleMatches.length, 1);
    assert.match(agents, /<!-- agent-context-kit:start -->/);
    assert.match(agents, /<!-- agent-context-kit:end -->/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init with target claude writes only CLAUDE.md", async () => {
  const root = await createRepo();

  try {
    const result = await generateRepositoryContext(root, { mode: "init", target: "claude" });

    const claude = await readFile(path.join(root, "CLAUDE.md"), "utf8");

    assert.match(claude, /<!-- agent-context-kit:start -->/);
    assert.match(claude, /# CLAUDE\.md/);
    assert.deepEqual(
      result.files.map((file) => path.relative(root, file.path)),
      ["CLAUDE.md"]
    );
    await assert.rejects(readFile(path.join(root, "AGENTS.md"), "utf8"));
    await assert.rejects(readFile(path.join(root, "docs", "README.md"), "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init with target all writes every supported AI context target", async () => {
  const root = await createRepo();

  try {
    const result = await generateRepositoryContext(root, { mode: "init", target: "all" });
    const files = result.files.map((file) => path.relative(root, file.path)).sort();

    assert.deepEqual(files, [
      ".codex/AGENTS.md",
      ".cursor/rules/agent-context.mdc",
      "AGENTS.md",
      "CLAUDE.md",
      "docs/README.md"
    ]);
    assert.match(await readFile(path.join(root, ".cursor", "rules", "agent-context.mdc"), "utf8"), /description:/);
    assert.match(await readFile(path.join(root, ".codex", "AGENTS.md"), "utf8"), /# Codex Instructions/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init with harmony preset adds HarmonyOS-specific guidance", async () => {
  const root = await createRepo();

  try {
    const result = await generateRepositoryContext(root, { mode: "init", preset: "harmony" });
    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");

    assert.deepEqual(
      result.files.map((file) => path.relative(root, file.path)),
      ["AGENTS.md", path.join("docs", "README.md")]
    );
    assert.match(agents, /## HarmonyOS Preset/);
    assert.match(agents, /ohpm/);
    assert.match(agents, /oh-package-lock\.json5/);
    assert.match(agents, /entry\/src\/main\/ets\/generated\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init includes detected workspaces in AGENTS.md", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "workspace-demo",
        workspaces: ["apps/*"],
        scripts: {
          test: "node --test"
        }
      }),
      "utf8"
    );
    await mkdir(path.join(root, "apps", "web"), { recursive: true });
    await writeFile(
      path.join(root, "apps", "web", "package.json"),
      JSON.stringify({
        name: "web",
        scripts: {
          test: "vitest"
        },
        dependencies: {
          next: "latest"
        }
      }),
      "utf8"
    );

    await generateRepositoryContext(root, { mode: "init" });

    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");

    assert.match(agents, /## Workspaces/);
    assert.match(agents, /\| apps\/web \| web \| Node\.js, Next\.js \| npm --workspace web test \|/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
