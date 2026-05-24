import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
