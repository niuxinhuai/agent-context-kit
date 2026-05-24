import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "../src/doctor.js";

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
