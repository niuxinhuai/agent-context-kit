import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "../src/doctor.js";

const execFileAsync = promisify(execFile);

async function createRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ackit-"));
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "doctor-demo",
      scripts: {
        test: "node --test"
      }
    }),
    "utf8"
  );
  await writeFile(
    path.join(root, "AGENTS.md"),
    [
      "# AGENTS.md",
      "",
      "## Common Commands",
      "",
      "- Build: npm run build",
      "- Test: npm test",
      "",
      "## Do Not",
      "",
      "- Do not commit secrets."
    ].join("\n"),
    "utf8"
  );
  await writeFile(path.join(root, "docs", "README.md"), "# Documentation\n", "utf8");
  return root;
}

test("runDoctor reports local absolute paths in AGENTS.md", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "AGENTS.md"),
      "# AGENTS.md\n\nLocal path: /Users/alice/work/private-repo\n\n## Do Not\n",
      "utf8"
    );

    const result = await runDoctor(root);

    assert.ok(result.issues.some((issue) => issue.code === "local-absolute-path"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runDoctor reports missing build script referenced by AGENTS.md", async () => {
  const root = await createRepo();

  try {
    const result = await runDoctor(root);

    assert.ok(result.issues.some((issue) => issue.code === "missing-build-script"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runDoctor reports README commands that are not present in package scripts", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "README.md"),
      ["# Demo", "", "```bash", "npm run release", "npm test", "```"].join("\n"),
      "utf8"
    );

    const result = await runDoctor(root);

    assert.ok(result.issues.some((issue) => issue.code === "unknown-readme-script"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runDoctor reports risky files tracked by git", async () => {
  const root = await createRepo();

  try {
    await mkdir(path.join(root, "dist"), { recursive: true });
    await mkdir(path.join(root, "apps", "web"), { recursive: true });
    await mkdir(path.join(root, "packages", "core", "coverage"), { recursive: true });
    await writeFile(path.join(root, ".env"), "TOKEN=secret\n", "utf8");
    await writeFile(path.join(root, ".DS_Store"), "metadata\n", "utf8");
    await writeFile(path.join(root, "apps", "web", ".env.local"), "TOKEN=secret\n", "utf8");
    await writeFile(path.join(root, "dist", "app.js"), "console.log('built');\n", "utf8");
    await writeFile(path.join(root, "packages", "core", "coverage", "report.json"), "{}\n", "utf8");

    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["add", "."], { cwd: root });
    await execFileAsync("git", ["add", "-f", ".DS_Store"], { cwd: root });

    const result = await runDoctor(root);
    const riskyPaths = result.issues
      .filter((issue) => issue.code === "tracked-risk-file")
      .map((issue) => issue.path)
      .sort();

    assert.deepEqual(riskyPaths, [
      ".DS_Store",
      ".env",
      "apps/web/.env.local",
      "dist/app.js",
      "packages/core/coverage/report.json"
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
