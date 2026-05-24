import path from "node:path";
import { exists, writeText } from "./fs-utils.js";
import { scanRepository } from "./scanner.js";
import { renderAgentsMd, renderDocsReadme } from "./templates.js";

export async function generateRepositoryContext(root, options = {}) {
  const scan = await scanRepository(root);
  const targets = [
    {
      path: path.join(scan.root, "AGENTS.md"),
      content: renderAgentsMd(scan)
    },
    {
      path: path.join(scan.root, "docs", "README.md"),
      content: renderDocsReadme(scan)
    }
  ];

  const files = [];

  for (const target of targets) {
    const alreadyExists = await exists(target.path);
    const shouldSkip = alreadyExists && !options.force;

    if (!shouldSkip && !options.dryRun) {
      await writeText(target.path, target.content);
    }

    files.push({
      path: target.path,
      skipped: shouldSkip
    });
  }

  return {
    mode: options.mode ?? "init",
    root: scan.root,
    files
  };
}
