import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { exists, readText } from "./fs-utils.js";
import { scanRepository } from "./scanner.js";

const execFileAsync = promisify(execFile);
const LOCAL_ABSOLUTE_PATH_PATTERN = /(?:\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Za-z]:\\Users\\[^\\\s]+)/;
const NPM_RUN_SCRIPT_PATTERN = /\bnpm\s+run\s+([a-zA-Z0-9:_-]+)/g;
const RISKY_TRACKED_FILE_PATTERNS = [
  /(^|\/)\.env(?:\.|$)/,
  /\.pem$/i,
  /\.key$/i,
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)coverage\//,
  /(^|\/)\.DS_Store$/
];

export async function runDoctor(root) {
  const scan = await scanRepository(root);
  const issues = [];

  if (!(await exists(scan.paths.agents))) {
    issues.push({
      severity: "warn",
      message: "AGENTS.md is missing.",
      fix: "Run agent-context-kit init."
    });
  }

  if (!(await exists(scan.paths.docsReadme))) {
    issues.push({
      severity: "warn",
      message: "docs/README.md is missing.",
      fix: "Run agent-context-kit init."
    });
  }

  if (!scan.primaryPackageManager) {
    issues.push({
      code: "missing-package-manager",
      severity: "info",
      message: "No package manager lockfile or manifest was detected.",
      fix: "Add a package manifest or document setup commands manually."
    });
  }

  if (!scan.commands.test) {
    issues.push({
      code: "missing-test-command",
      severity: "info",
      message: "No test command was detected.",
      fix: "Add a test script or document the verification flow in AGENTS.md."
    });
  }

  if (await exists(scan.paths.agents)) {
    const agentsText = await readText(scan.paths.agents);
    if (!agentsText.includes("Do Not")) {
      issues.push({
        code: "missing-guardrails",
        severity: "info",
        message: "AGENTS.md does not appear to include explicit guardrails.",
        fix: "Document repository-specific boundaries, generated files, and commit rules."
      });
    }

    if (LOCAL_ABSOLUTE_PATH_PATTERN.test(agentsText)) {
      issues.push({
        code: "local-absolute-path",
        severity: "warn",
        message: "AGENTS.md appears to contain a local absolute path.",
        fix: "Replace machine-specific paths with repository-relative paths."
      });
    }

    if (agentsText.includes("npm run build") && !scan.scripts.build) {
      issues.push({
        code: "missing-build-script",
        severity: "warn",
        message: "AGENTS.md references npm run build, but package.json does not define a build script.",
        fix: "Update AGENTS.md or add a package.json build script."
      });
    }
  }

  const readmePath = `${scan.root}/README.md`;
  if (await exists(readmePath)) {
    const readmeText = await readText(readmePath);
    const unknownScripts = findUnknownNpmScripts(readmeText, scan.scripts);

    for (const scriptName of unknownScripts) {
      issues.push({
        code: "unknown-readme-script",
        severity: "warn",
        message: `README.md references npm script "${scriptName}", but package.json does not define it.`,
        fix: "Update README.md or add the missing package.json script."
      });
    }
  }

  for (const filePath of await listTrackedRiskyFiles(scan.root)) {
    issues.push({
      code: "tracked-risk-file",
      severity: "warn",
      path: filePath,
      message: `${filePath} is tracked by git and looks like a secret, local artifact, or build output.`,
      fix: "Remove it from git history/index when appropriate and add it to .gitignore."
    });
  }

  return {
    root: scan.root,
    issues
  };
}

async function listTrackedRiskyFiles(root) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync("git", ["ls-files"], { cwd: root }));
  } catch {
    return [];
  }

  return stdout
    .split("\n")
    .filter(Boolean)
    .filter((filePath) => RISKY_TRACKED_FILE_PATTERNS.some((pattern) => pattern.test(filePath)));
}

function findUnknownNpmScripts(text, scripts) {
  const result = new Set();

  for (const match of text.matchAll(NPM_RUN_SCRIPT_PATTERN)) {
    const scriptName = match[1];
    if (!scripts[scriptName]) {
      result.add(scriptName);
    }
  }

  return [...result];
}
