import { exists, readText } from "./fs-utils.js";
import { scanRepository } from "./scanner.js";

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

  if (!scan.packageManager) {
    issues.push({
      severity: "info",
      message: "No package manager lockfile or manifest was detected.",
      fix: "Add a package manifest or document setup commands manually."
    });
  }

  if (!scan.commands.test) {
    issues.push({
      severity: "info",
      message: "No test command was detected.",
      fix: "Add a test script or document the verification flow in AGENTS.md."
    });
  }

  if (await exists(scan.paths.agents)) {
    const agentsText = await readText(scan.paths.agents);
    if (!agentsText.includes("Do Not")) {
      issues.push({
        severity: "info",
        message: "AGENTS.md does not appear to include explicit guardrails.",
        fix: "Document repository-specific boundaries, generated files, and commit rules."
      });
    }
  }

  return {
    root: scan.root,
    issues
  };
}
