import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(projectRoot, "bin", "agent-context-kit.js");

async function createRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ackit-"));
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "cli-demo",
      scripts: {
        test: "node --test"
      }
    }),
    "utf8"
  );
  return root;
}

test("scan --json prints parseable repository metadata", async () => {
  const root = await createRepo();

  try {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, "scan", "--json", "--cwd", root]);
    const result = JSON.parse(stdout);

    assert.equal(result.name, "cli-demo");
    assert.equal(result.packageManager, "npm");
    assert.equal(result.commands.test, "npm test");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init does not overwrite existing context files by default", async () => {
  const root = await createRepo();

  try {
    await writeFile(path.join(root, "AGENTS.md"), "manual notes\n", "utf8");

    const { stdout } = await execFileAsync(process.execPath, [cliPath, "init", "--cwd", root]);
    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");

    assert.match(stdout, /skipped: .*AGENTS\.md/);
    assert.equal(agents, "manual notes\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
