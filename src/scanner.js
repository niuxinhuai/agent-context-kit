import path from "node:path";
import { exists, isDirectory, listDirSafe, readJson, toPosixPath } from "./fs-utils.js";

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".venv",
  "venv",
  "target"
]);

export async function scanRepository(root) {
  const resolvedRoot = path.resolve(root);
  const packageJsonPath = path.join(resolvedRoot, "package.json");
  const pyprojectPath = path.join(resolvedRoot, "pyproject.toml");
  const cargoPath = path.join(resolvedRoot, "Cargo.toml");
  const goModPath = path.join(resolvedRoot, "go.mod");
  const ohPackagePath = path.join(resolvedRoot, "oh-package.json5");

  const packageJson = (await exists(packageJsonPath)) ? await readJson(packageJsonPath) : undefined;
  const topLevel = await listDirSafe(resolvedRoot);
  const docs = await discoverDocs(resolvedRoot);
  const stack = [];

  if (packageJson) {
    stack.push("Node.js");
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    if (deps.react) stack.push("React");
    if (deps.next) stack.push("Next.js");
    if (deps.vue) stack.push("Vue");
    if (deps.vite) stack.push("Vite");
    if (deps.typescript) stack.push("TypeScript");
  }

  if (await exists(pyprojectPath)) stack.push("Python");
  if (await exists(cargoPath)) stack.push("Rust");
  if (await exists(goModPath)) stack.push("Go");
  if (await exists(ohPackagePath)) stack.push("HarmonyOS ArkTS");
  if (topLevel.some((entry) => entry.name === "pubspec.yaml")) stack.push("Flutter/Dart");

  const packageManagers = await detectPackageManagers(resolvedRoot);
  const primaryPackageManager = packageManagers[0];
  const commands = detectCommands(packageJson, primaryPackageManager);

  return {
    name: packageJson?.name ?? path.basename(resolvedRoot),
    root: resolvedRoot,
    stack: [...new Set(stack)],
    packageManager: primaryPackageManager,
    primaryPackageManager,
    packageManagers,
    commands,
    scripts: packageJson?.scripts ?? {},
    docs,
    directories: topLevel.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    paths: {
      agents: path.join(resolvedRoot, "AGENTS.md"),
      docsReadme: path.join(resolvedRoot, "docs", "README.md")
    }
  };
}

function detectCommands(packageJson, packageManager) {
  const scripts = packageJson?.scripts ?? {};
  const runner = packageManager === "pnpm" ? "pnpm" : packageManager === "yarn" ? "yarn" : "npm";

  return {
    install: undefined,
    build: scripts.build ? `${runner} run build` : undefined,
    test: scripts.test ? `${runner} test` : undefined,
    lint: scripts.lint ? `${runner} run lint` : undefined,
    dev: scripts.dev ? `${runner} run dev` : undefined
  };
}

async function detectPackageManagers(root) {
  const candidates = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lockb", "bun"],
    ["oh-package.json5", "ohpm"],
    ["pubspec.yaml", "flutter"],
    ["pyproject.toml", "python"],
    ["Cargo.toml", "cargo"],
    ["go.mod", "go"]
  ];
  const managers = [];

  for (const [fileName, manager] of candidates) {
    if (await exists(path.join(root, fileName))) {
      managers.push(manager);
    }
  }

  if ((await exists(path.join(root, "package.json"))) && !managers.some((manager) => ["npm", "pnpm", "yarn", "bun"].includes(manager))) {
    managers.unshift("npm");
  }

  return [...new Set(managers)];
}

async function discoverDocs(root) {
  const docsRoot = path.join(root, "docs");
  if (!(await isDirectory(docsRoot))) {
    return [];
  }

  const entries = await listMarkdownFiles(docsRoot, docsRoot, 2);
  return entries.sort();
}

async function listMarkdownFiles(baseDir, currentDir, depth) {
  if (depth < 0) return [];

  const entries = await listDirSafe(currentDir);
  const results = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listMarkdownFiles(baseDir, fullPath, depth - 1)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(toPosixPath(path.relative(baseDir, fullPath)));
    }
  }

  return results;
}
