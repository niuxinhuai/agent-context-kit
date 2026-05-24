import { runDoctor } from "./doctor.js";
import { exists } from "./fs-utils.js";
import { generateRepositoryContext, getSupportedPresets, getSupportedTargets } from "./generator.js";
import { scanRepository } from "./scanner.js";
import path from "node:path";

const COMMANDS = new Set(["init", "scan", "doctor", "update", "explain", "report", "help", "--help", "-h"]);

export async function runCli(argv) {
  const args = argv.slice(2);
  const command = args[0] ?? "help";

  if (!COMMANDS.has(command)) {
    throw new Error(`Unknown command "${command}". Run agent-context-kit help.`);
  }

  const options = parseOptions(args.slice(1));
  const cwd = options.cwd ?? process.cwd();

  switch (command) {
    case "init":
      return initCommand(cwd, options);
    case "scan":
      return scanCommand(cwd, options);
    case "doctor":
      return doctorCommand(cwd, options);
    case "explain":
      return explainCommand(cwd, options);
    case "report":
      return reportCommand(cwd, options);
    case "update":
      return updateCommand(cwd, options);
    case "help":
    case "--help":
    case "-h":
      return helpCommand();
    default:
      return helpCommand();
  }
}

function parseOptions(args) {
  const options = {
    force: false,
    json: false,
    dryRun: false,
    strict: false,
    target: undefined,
    preset: undefined,
    cwd: undefined
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--target") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("--target requires a value.");
      }
      options.target = value;
      index += 1;
    } else if (arg === "--preset") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("--preset requires a value.");
      }
      options.preset = value;
      index += 1;
    } else if (arg === "--cwd") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("--cwd requires a path.");
      }
      options.cwd = value;
      index += 1;
    } else {
      throw new Error(`Unknown option "${arg}".`);
    }
  }

  return options;
}

async function initCommand(cwd, options) {
  const result = await generateRepositoryContext(cwd, {
    force: options.force,
    dryRun: options.dryRun,
    target: options.target,
    preset: options.preset,
    mode: "init"
  });

  printGenerationResult(result, options);
}

async function updateCommand(cwd, options) {
  const result = await generateRepositoryContext(cwd, {
    force: true,
    dryRun: options.dryRun,
    target: options.target,
    preset: options.preset,
    mode: "update"
  });

  printGenerationResult(result, options);
}

async function scanCommand(cwd, options) {
  const result = await scanRepository(cwd);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Repository: ${result.name}`);
  console.log(`Root: ${result.root}`);
  console.log(`Detected stack: ${result.stack.length ? result.stack.join(", ") : "unknown"}`);
  console.log(`Primary package manager: ${result.primaryPackageManager ?? "unknown"}`);
  console.log(`Package managers: ${result.packageManagers.length ? result.packageManagers.join(", ") : "unknown"}`);
  console.log(`Build command: ${result.commands.build ?? "not detected"}`);
  console.log(`Test command: ${result.commands.test ?? "not detected"}`);
  console.log(`Docs: ${result.docs.length ? result.docs.join(", ") : "none detected"}`);
}

async function doctorCommand(cwd, options) {
  const result = await runDoctor(cwd);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.issues.length === 0) {
    console.log("No issues found. Repository context looks healthy.");
    return;
  }

  for (const issue of result.issues) {
    console.log(`[${issue.severity}] ${issue.message}`);
    if (issue.fix) {
      console.log(`  fix: ${issue.fix}`);
    }
  }

  if (options.strict && result.issues.some((issue) => issue.severity === "warn")) {
    console.log("Strict mode failed: warnings were found.");
    process.exitCode = 1;
  }
}

async function explainCommand(cwd, options) {
  const result = await scanRepository(cwd);
  const summary = {
    repository: result.name,
    stack: result.stack.length ? result.stack.join(", ") : "unknown stack",
    packageManager: result.primaryPackageManager ?? "unknown package manager",
    testCommand: result.commands.test ?? "no test command detected",
    contextFiles: ["AGENTS.md", "docs/README.md"]
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`${summary.repository} appears to be a ${summary.stack} project using ${summary.packageManager}.`);
  console.log(`Use ${summary.testCommand} for verification.`);
  console.log(`AI context is managed in ${summary.contextFiles.join(" and ")}.`);
}

async function reportCommand(cwd, options) {
  const result = await buildReport(cwd);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(renderMarkdownReport(result));
}

async function buildReport(cwd) {
  const scan = await scanRepository(cwd);
  const doctor = await runDoctor(cwd);
  const doctorWarnings = doctor.issues.filter((issue) => issue.severity === "warn");

  return {
    repository: scan.name,
    stack: scan.stack,
    packageManagers: scan.packageManagers,
    testCommand: scan.commands.test ?? null,
    lintCommand: scan.commands.lint ?? null,
    contextFiles: await detectContextFiles(scan.root),
    doctorWarnings
  };
}

async function detectContextFiles(root) {
  const candidates = [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules/agent-context.mdc",
    ".codex/AGENTS.md",
    "docs/README.md"
  ];
  const found = [];

  for (const candidate of candidates) {
    if (await exists(path.join(root, candidate))) {
      found.push(candidate);
    }
  }

  return found;
}

function renderMarkdownReport(result) {
  const warnings = result.doctorWarnings.length
    ? result.doctorWarnings.map((issue) => issue.message).join("; ")
    : "none";

  return [
    "## Repository Context",
    `- Repository: ${result.repository}`,
    `- Stack: ${result.stack.length ? result.stack.join(", ") : "unknown"}`,
    `- Package managers: ${result.packageManagers.length ? result.packageManagers.join(", ") : "unknown"}`,
    `- Test: ${result.testCommand ?? "not detected"}`,
    `- Lint: ${result.lintCommand ?? "not detected"}`,
    `- AI context: ${result.contextFiles.length ? result.contextFiles.join(", ") : "none detected"}`,
    `- Doctor warnings: ${warnings}`
  ].join("\n");
}

function printGenerationResult(result, options) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const file of result.files) {
    const action = file.skipped ? "skipped" : options.dryRun ? "would write" : "wrote";
    console.log(`${action}: ${file.path}`);
  }
}

function helpCommand() {
  console.log(`agent-context-kit

Usage:
  agent-context-kit init [--force] [--dry-run] [--cwd <path>]
  agent-context-kit init [--target agents|claude|cursor|codex|all] [--cwd <path>]
  agent-context-kit init [--preset node|python|harmony|flutter] [--cwd <path>]
  agent-context-kit update [--target agents|claude|cursor|codex|all] [--dry-run] [--cwd <path>]
  agent-context-kit scan [--json] [--cwd <path>]
  agent-context-kit doctor [--json] [--strict] [--cwd <path>]
  agent-context-kit explain [--json] [--cwd <path>]
  agent-context-kit report [--json] [--cwd <path>]

Commands:
  init     Generate AGENTS.md and docs/README.md without overwriting existing files.
  update   Regenerate managed context files.
  scan     Print detected project stack, package manager, commands, and docs.
  doctor   Check whether AI-facing context files are missing or inconsistent.
  explain  Print a short human-readable repository summary.
  report   Print a copyable repository context report.

Targets:
  ${getSupportedTargets().join(", ")}

Presets:
  ${getSupportedPresets().join(", ")}
`);
}
