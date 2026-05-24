import path from "node:path";
import { exists, readText, writeText } from "./fs-utils.js";
import { scanRepository } from "./scanner.js";
import { renderAgentsMd, renderDocsReadme } from "./templates.js";

const MANAGED_START = "<!-- agent-context-kit:start -->";
const MANAGED_END = "<!-- agent-context-kit:end -->";

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
    const isUpdate = options.mode === "update";
    const shouldSkip = alreadyExists && !options.force && !isUpdate;
    const generatedContent = wrapManagedContent(target.content);

    if (!shouldSkip && !options.dryRun) {
      const content =
        isUpdate && alreadyExists
          ? mergeManagedContent(await readText(target.path), generatedContent)
          : generatedContent;
      await writeText(target.path, content);
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

function wrapManagedContent(content) {
  return `${MANAGED_START}\n${content.trimEnd()}\n${MANAGED_END}\n`;
}

function mergeManagedContent(existingContent, generatedContent) {
  const startIndex = existingContent.indexOf(MANAGED_START);
  const endIndex = existingContent.indexOf(MANAGED_END);

  if (startIndex !== -1 && endIndex > startIndex) {
    const before = existingContent.slice(0, startIndex).trimEnd();
    const after = existingContent.slice(endIndex + MANAGED_END.length).trimStart();
    return joinSections(before, generatedContent.trimEnd(), after);
  }

  if (isLegacyGeneratedContent(existingContent)) {
    return generatedContent;
  }

  return joinSections(existingContent.trimEnd(), generatedContent.trimEnd());
}

function joinSections(...sections) {
  return `${sections.filter(Boolean).join("\n\n")}\n`;
}

function isLegacyGeneratedContent(content) {
  const normalized = content.trimStart();
  return (
    normalized.startsWith("# AGENTS.md\n\nThis file is the first stop for AI coding agents working in this repository.") ||
    normalized.startsWith("# Documentation\n\nThis directory is the human and AI documentation index for")
  );
}
