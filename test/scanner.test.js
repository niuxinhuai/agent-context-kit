import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { scanRepository } from "../src/scanner.js";

test("scanRepository detects package metadata and scripts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ackit-"));

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "demo",
        scripts: {
          build: "vite build",
          test: "node --test",
          lint: "eslint ."
        },
        dependencies: {
          react: "latest"
        },
        devDependencies: {
          vite: "latest"
        }
      }),
      "utf8"
    );

    const result = await scanRepository(root);

    assert.equal(result.name, "demo");
    assert.equal(result.packageManager, "npm");
    assert.deepEqual(result.stack, ["Node.js", "React", "Vite"]);
    assert.equal(result.commands.build, "npm run build");
    assert.equal(result.commands.test, "npm test");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scanRepository reports multiple package managers in mixed repositories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ackit-"));

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "mixed-demo",
        scripts: {
          test: "node --test"
        }
      }),
      "utf8"
    );
    await writeFile(path.join(root, "pyproject.toml"), "[project]\nname = \"mixed-demo\"\n", "utf8");
    await writeFile(path.join(root, "go.mod"), "module example.com/mixed-demo\n", "utf8");

    const result = await scanRepository(root);

    assert.equal(result.primaryPackageManager, "npm");
    assert.deepEqual(result.packageManagers, ["npm", "python", "go"]);
    assert.equal(result.packageManager, "npm");
    assert.deepEqual(result.stack, ["Node.js", "Python", "Go"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scanRepository detects package.json workspaces", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ackit-"));

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "workspace-demo",
        workspaces: ["apps/*", "packages/*"],
        scripts: {
          test: "node --test"
        }
      }),
      "utf8"
    );
    await mkdir(path.join(root, "apps", "web"), { recursive: true });
    await mkdir(path.join(root, "packages", "core"), { recursive: true });
    await writeFile(
      path.join(root, "apps", "web", "package.json"),
      JSON.stringify({
        name: "web",
        scripts: {
          test: "vitest",
          dev: "vite"
        },
        dependencies: {
          next: "latest"
        }
      }),
      "utf8"
    );
    await writeFile(
      path.join(root, "packages", "core", "package.json"),
      JSON.stringify({
        name: "core",
        scripts: {
          test: "node --test"
        },
        devDependencies: {
          typescript: "latest"
        }
      }),
      "utf8"
    );

    const result = await scanRepository(root);

    assert.deepEqual(result.workspaces, [
      {
        path: "apps/web",
        name: "web",
        stack: ["Node.js", "Next.js"],
        packageManager: "npm",
        commands: {
          test: "npm --workspace web test",
          dev: "npm --workspace web run dev"
        }
      },
      {
        path: "packages/core",
        name: "core",
        stack: ["Node.js", "TypeScript"],
        packageManager: "npm",
        commands: {
          test: "npm --workspace core test"
        }
      }
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
