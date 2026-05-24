import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("explain prints a concise repository summary", async () => {
  const root = await createRepo();

  try {
    await writeFile(path.join(root, "AGENTS.md"), "# AGENTS.md\n\n## Do Not\n", "utf8");

    const { stdout } = await execFileAsync(process.execPath, [cliPath, "explain", "--cwd", root]);

    assert.match(stdout, /cli-demo/);
    assert.match(stdout, /Node\.js/);
    assert.match(stdout, /npm test/);
    assert.match(stdout, /AGENTS\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("doctor --strict exits non-zero when warnings are found", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "AGENTS.md"),
      "# AGENTS.md\n\nLocal path: /Users/alice/private-repo\n\n## Do Not\n",
      "utf8"
    );

    await assert.rejects(
      execFileAsync(process.execPath, [cliPath, "doctor", "--strict", "--cwd", root]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /AGENTS\.md appears to contain a local absolute path/);
        assert.match(error.stdout, /Strict mode failed/);
        return true;
      }
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init --target cursor writes Cursor rules", async () => {
  const root = await createRepo();

  try {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, "init", "--target", "cursor", "--cwd", root]);
    const cursorRules = await readFile(path.join(root, ".cursor", "rules", "agent-context.mdc"), "utf8");

    assert.match(stdout, /agent-context\.mdc/);
    assert.match(cursorRules, /description:/);
    assert.match(cursorRules, /agent-context-kit:start/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("report prints markdown repository context", async () => {
  const root = await createRepo();

  try {
    await writeFile(path.join(root, "AGENTS.md"), "# AGENTS.md\n\n## Do Not\n", "utf8");
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "README.md"), "# Documentation\n", "utf8");

    const { stdout } = await execFileAsync(process.execPath, [cliPath, "report", "--cwd", root]);

    assert.match(stdout, /## Repository Context/);
    assert.match(stdout, /- Repository: cli-demo/);
    assert.match(stdout, /- Stack: Node\.js/);
    assert.match(stdout, /- Test: npm test/);
    assert.match(stdout, /- AI context: AGENTS\.md/);
    assert.match(stdout, /- Doctor warnings: none/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("report --json prints parseable context with doctor warnings", async () => {
  const root = await createRepo();

  try {
    await writeFile(
      path.join(root, "AGENTS.md"),
      "# AGENTS.md\n\nLocal path: /Users/alice/private-repo\n\n## Do Not\n",
      "utf8"
    );

    const { stdout } = await execFileAsync(process.execPath, [cliPath, "report", "--json", "--cwd", root]);
    const result = JSON.parse(stdout);

    assert.equal(result.repository, "cli-demo");
    assert.deepEqual(result.stack, ["Node.js"]);
    assert.equal(result.testCommand, "npm test");
    assert.ok(result.contextFiles.includes("AGENTS.md"));
    assert.ok(result.doctorWarnings.some((issue) => issue.code === "local-absolute-path"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init --preset python writes Python-specific guidance", async () => {
  const root = await createRepo();

  try {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, "init", "--preset", "python", "--cwd", root]);
    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");

    assert.match(stdout, /AGENTS\.md/);
    assert.match(agents, /## Python Preset/);
    assert.match(agents, /\.venv\//);
    assert.match(agents, /pytest/);
    assert.match(agents, /ruff/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
