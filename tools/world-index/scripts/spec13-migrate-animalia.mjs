import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const worldDir = path.join(repoRoot, "worlds", "animalia");
const sourceDir = path.join(worldDir, "_source");
const snapshotDir = path.join(repoRoot, ".pre-migration-snapshot", "animalia");

const retiredFiles = [
  "CANON_LEDGER.md",
  "INVARIANTS.md",
  "MYSTERY_RESERVE.md",
  "OPEN_QUESTIONS.md",
  "EVERYDAY_LIFE.md",
  "INSTITUTIONS.md",
  "MAGIC_OR_TECH_SYSTEMS.md",
  "GEOGRAPHY.md",
  "ECONOMY_AND_RESOURCES.md",
  "PEOPLES_AND_SPECIES.md",
  "TIMELINE.md"
];

const proseFiles = [
  ["EVERYDAY_LIFE.md", "EVERYDAY_LIFE", "everyday-life", "ELF"],
  ["INSTITUTIONS.md", "INSTITUTIONS", "institutions", "INS"],
  ["MAGIC_OR_TECH_SYSTEMS.md", "MAGIC_OR_TECH_SYSTEMS", "magic-or-tech-systems", "MTS"],
  ["GEOGRAPHY.md", "GEOGRAPHY", "geography", "GEO"],
  ["ECONOMY_AND_RESOURCES.md", "ECONOMY_AND_RESOURCES", "economy-and-resources", "ECR"],
  ["PEOPLES_AND_SPECIES.md", "PEOPLES_AND_SPECIES", "peoples-and-species", "PAS"],
  ["TIMELINE.md", "TIMELINE", "timeline", "TML"]
];

const invariantCategories = new Map([
  ["Ontological Invariants", "ontological"],
  ["Causal Invariants", "causal"],
  ["Distribution Invariants", "distribution"],
  ["Social Invariants", "social"],
  ["Aesthetic / Thematic Invariants", "aesthetic_thematic"]
]);

const sourceDirectories = [
  "canon",
  "change-log",
  "invariants",
  "mystery-reserve",
  "open-questions",
  "entities",
  ...proseFiles.map(([, , dir]) => dir)
];

const allowedFileClasses = new Set(proseFiles.map(([, fileClass]) => fileClass));
const changeDates = new Map();
const canonUpdates = new Map();

function main() {
  ensureLegacyInputs();
  if (!existsSync(snapshotDir)) {
    mkdirSync(path.dirname(snapshotDir), { recursive: true });
    cpSync(worldDir, snapshotDir, { recursive: true, dereference: false });
  }

  rmSync(sourceDir, { recursive: true, force: true });
  for (const directory of sourceDirectories) {
    mkdirSync(path.join(sourceDir, directory), { recursive: true });
  }

  migrateCanonLedger();
  migrateInvariants();
  migrateMysteryReserve();
  migrateOpenQuestions();
  migrateEntities();
  migrateProseSections();
  stripOntologyRegistry();
  removeOrphanHeadingAttributionLines();

  for (const file of retiredFiles) {
    rmSync(path.join(worldDir, file), { force: true });
  }
}

function ensureLegacyInputs() {
  for (const file of [...retiredFiles, "ONTOLOGY.md", "WORLD_KERNEL.md"]) {
    if (!existsSync(path.join(worldDir, file))) {
      throw new Error(`Missing legacy input ${file}`);
    }
  }
}

function migrateCanonLedger() {
  const ledger = readWorldFile("CANON_LEDGER.md");
  for (const block of yamlBlocks(ledger)) {
    const parsed = parseYamlWithRecovery(block);
    if (parsed?.id?.startsWith?.("CF-")) {
      const record = parsed;
      record.required_world_updates = (record.required_world_updates ?? []).map((target) =>
        String(target).replace(/\.md$/i, "")
      );
      canonUpdates.set(record.id, new Set(record.required_world_updates ?? []));
      writeYaml("canon", `${record.id}.yaml`, record);
      continue;
    }
    if (parsed?.change_id?.startsWith?.("CH-")) {
      changeDates.set(parsed.change_id, String(parsed.date ?? ""));
      writeYaml("change-log", `${parsed.change_id}.yaml`, parsed);
    }
  }
}

function migrateInvariants() {
  const markdown = readWorldFile("INVARIANTS.md");
  const h2Sections = splitMarkdown(markdown, 2).filter((section) => invariantCategories.has(section.heading));
  const orphanExtensionsByTarget = new Map();

  for (const categorySection of h2Sections) {
    const category = invariantCategories.get(categorySection.heading);
    const h3Sections = splitMarkdown(categorySection.body, 3);
    for (const match of categorySection.body.matchAll(
      /^<!-- added by (CF-\d{4}) --> ### ([A-Z]+-\d+)-EXT \((CH-\d{4})\) — (.+)\n\n([\s\S]*?)(?=\n### )/gm
    )) {
      const target = match[2];
      orphanExtensionsByTarget.set(target, [
        ...(orphanExtensionsByTarget.get(target) ?? []),
        {
          originating_cf: match[1],
          change_id: match[3],
          date: changeDates.get(match[3]) ?? "",
          label: match[4].trim(),
          body: match[5].trim()
        }
      ]);
    }
    for (const section of h3Sections) {
      const headingMatch = section.heading.match(/^([A-Z]+-\d+)(?:-EXT)?(?:\s+[—-]\s+(.+))?$/);
      if (!headingMatch) {
        continue;
      }
      const id = headingMatch[1];
      if (section.heading.includes("-EXT")) {
        const target = id.replace(/-EXT$/, "");
        const extensions = extractExtensions(section.raw, { removeListMarker: false });
        if (extensions.length > 0) {
          orphanExtensionsByTarget.set(target, [...(orphanExtensionsByTarget.get(target) ?? []), ...extensions]);
        }
        continue;
      }

      const fields = parseBoldBulletFields(section.body);
      const extensions = [
        ...(orphanExtensionsByTarget.get(id) ?? []),
        ...extractExtensions(section.body, { removeListMarker: true })
      ];
      const record = {
        id,
        category,
        title: headingMatch[2] ?? id,
        statement: fields.get("Statement") ?? "",
        rationale: fields.get("Rationale") ?? "",
        examples: listFromText(fields.get("Examples")),
        non_examples: listFromText(fields.get("Non-examples")),
        break_conditions: fields.get("Break conditions") ?? "",
        revision_difficulty: normalizeDifficulty(fields.get("Revision difficulty")),
        extensions
      };
      writeYaml("invariants", `${id}.yaml`, record);
    }
  }
}

function migrateMysteryReserve() {
  const markdown = readWorldFile("MYSTERY_RESERVE.md");
  const sections = splitMarkdown(markdown, 2).filter((section) => /^M-\d+\s+[—-]\s+/.test(section.heading));
  for (const section of sections) {
    const [, id, title] = section.heading.match(/^(M-\d+)\s+[—-]\s+(.+)$/);
    const fields = parseBoldBlockFields(section.body);
    const record = {
      id,
      title,
      status: normalizeStatus(fields.get("Status")),
      knowns: bulletListAfterLabel(section.body, "Knowns"),
      unknowns: bulletListAfterLabel(section.body, "Unknowns"),
      common_interpretations: bulletListAfterLabel(section.body, "Common in-world interpretations").map((item) => {
        const match = item.match(/^(.*?)(?:\s+\(([^()]+)\))?[.;]?$/);
        return {
          description: (match?.[1] ?? item).trim(),
          holders: (match?.[2] ?? "").trim()
        };
      }),
      disallowed_cheap_answers: bulletListAfterLabel(section.body, "Disallowed cheap answers"),
      domains_touched: splitDomains(fields.get("Domains touched")),
      future_resolution_safety: normalizeSafety(fields.get("Future-resolution safety")),
      extensions: extractExtensions(section.body, { removeListMarker: false })
    };
    writeYaml("mystery-reserve", `${id}.yaml`, record);
  }
}

function migrateOpenQuestions() {
  const markdown = readWorldFile("OPEN_QUESTIONS.md");
  const sections = splitMarkdown(markdown, 2);
  let index = 1;
  for (const section of sections) {
    const id = `OQ-${String(index).padStart(4, "0")}`;
    const fields = parseBoldBulletFields(section.body);
    const extensions = extractExtensions(section.body, { removeListMarker: true });
    const body = stripOpenQuestionControlLines(section.body).trim();
    const record = {
      id,
      topic: section.heading,
      body,
      when_to_resolve: fields.get("When to resolve") ?? "",
      caution: fields.get("Caution") ?? "",
      extensions
    };
    writeYaml("open-questions", `${id}.yaml`, record);
    index += 1;
  }
}

function migrateEntities() {
  const ontology = readWorldFile("ONTOLOGY.md");
  const registryBlock = yamlBlocks(ontology)[0];
  const parsed = YAML.parse(registryBlock);
  const entities = parsed.named_entities ?? [];
  entities.forEach((entry, index) => {
    const record = {
      id: `ENT-${String(index + 1).padStart(4, "0")}`,
      canonical_name: entry.canonical_name,
      entity_kind: entry.entity_kind,
      aliases: [],
      originating_cf: entry.canonical_name === "Ash-Seal" ? "CF-0043" : null,
      scope_notes:
        entry.canonical_name === "Ash-Seal"
          ? "Brinewick-local civic-chartered non-guild commercial company introduced by CF-0043."
          : "Genesis named region from the original Animalia named entity registry."
    };
    writeYaml("entities", `${record.id}.yaml`, record);
  });
}

function migrateProseSections() {
  for (const [fileName, fileClass, directory, prefix] of proseFiles) {
    const markdown = readWorldFile(fileName);
    const sections = splitMarkdown(markdown, 2);
    const requiredTouchers = [...canonUpdates]
      .filter(([, updates]) => updates.has(fileClass))
      .map(([cfId]) => cfId);
    sections.forEach((section, index) => {
      const localTouchers = idsInText(section.raw, /\bCF-\d{4}\b/g);
      const record = {
        id: `SEC-${prefix}-${String(index + 1).padStart(3, "0")}`,
        file_class: fileClass,
        order: index + 1,
        heading: section.heading,
        heading_level: 2,
        body: section.body.trimEnd(),
        extensions: extractExtensions(section.body, { removeListMarker: false }),
        touched_by_cf: [...new Set([...localTouchers, ...requiredTouchers])].sort()
      };
      writeYaml(directory, `${record.id}.yaml`, record);
    });
  }
}

function stripOntologyRegistry() {
  const ontology = readWorldFile("ONTOLOGY.md");
  const stripped = ontology.replace(
    /## Named Entity Registry\n\n```yaml\n[\s\S]*?\n```\n\n---\n\n/,
    "\n"
  );
  writeFileSync(path.join(worldDir, "ONTOLOGY.md"), stripped);
}

function removeOrphanHeadingAttributionLines() {
  for (const filePath of listYamlFiles(sourceDir)) {
    const source = readFileSync(filePath, "utf8");
    const cleaned = source.replace(
      /\n  <!-- added by CF-\d{4} -->\n(?=(?:extensions:|when_to_resolve:|  ---))/g,
      "\n"
    );
    if (cleaned !== source) {
      writeFileSync(filePath, cleaned);
    }
  }
}

function listYamlFiles(directory) {
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...listYamlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".yaml")) {
      results.push(entryPath);
    }
  }
  return results;
}

function yamlBlocks(markdown) {
  return [...markdown.matchAll(/```yaml\n([\s\S]*?)\n```/g)].map((match) => match[1]);
}

function parseYamlWithRecovery(rawYaml) {
  let candidate = rawYaml;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    try {
      return YAML.parse(candidate);
    } catch (error) {
      const lineNumber = extractYamlErrorLine(error);
      if (lineNumber === null) {
        throw error;
      }
      const recovered = recoverSequenceScalarAtLine(candidate, lineNumber);
      if (recovered === candidate) {
        throw error;
      }
      candidate = recovered;
    }
  }
  return YAML.parse(candidate);
}

function extractYamlErrorLine(error) {
  if (!(error instanceof Error)) {
    return null;
  }
  const match = error.message.match(/line (\d+), column \d+/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function recoverSequenceScalarAtLine(rawYaml, lineNumber) {
  const lines = rawYaml.split("\n");
  const targetIndex = lineNumber - 1;
  for (let index = targetIndex; index >= 0; index -= 1) {
    const line = lines[index];
    const match = line?.match(/^(\s*)- (.+)$/);
    if (!match) {
      continue;
    }
    const indentation = match[1] ?? "";
    const itemBody = match[2] ?? "";
    if (itemBody.length === 0 || itemBody.startsWith(">-") || itemBody.startsWith(">") || itemBody.startsWith("|")) {
      return rawYaml;
    }
    if (/^[A-Za-z0-9_-]+:\s*(?:.*)?$/.test(itemBody)) {
      return rawYaml;
    }
    lines.splice(index, 1, `${indentation}- >-`, `${indentation}  ${itemBody}`);
    return lines.join("\n");
  }
  return rawYaml;
}

function splitMarkdown(markdown, level) {
  const marker = "#".repeat(level);
  const regex = new RegExp(`^${marker} (.+)$`, "gm");
  const matches = [...markdown.matchAll(regex)];
  return matches.map((match, index) => {
    const start = match.index;
    const bodyStart = start + match[0].length + 1;
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    return {
      heading: match[1].trim(),
      raw: markdown.slice(start, end).trimEnd(),
      body: markdown.slice(bodyStart, end).trim()
    };
  });
}

function parseBoldBulletFields(text) {
  const fields = new Map();
  const regex = /^-\s+\*\*([^*]+)\*\*:\s*([\s\S]*?)(?=\n-\s+\*\*|\n-\s+<!--|\n<!--|\n#{2,3} |\n---|$)/gm;
  for (const match of text.matchAll(regex)) {
    fields.set(match[1].trim(), match[2].trim());
  }
  return fields;
}

function parseBoldBlockFields(text) {
  const fields = new Map();
  const regex = /^\*\*([^*]+)\*\*:\s*([\s\S]*?)(?=\n\*\*|\n<!--|\n#{2,3} |\n---|$)/gm;
  for (const match of text.matchAll(regex)) {
    fields.set(match[1].trim(), match[2].trim());
  }
  return fields;
}

function bulletListAfterLabel(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^\\*\\*${escaped}\\*\\*:\\n([\\s\\S]*?)(?=\\n\\*\\*|\\n<!--|\\n#{2,3} |\\n---|$)`, "m"));
  if (!match) {
    return [];
  }
  return match[1]
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim().replace(/[.;]$/, ""));
}

function extractExtensions(text, { removeListMarker }) {
  const prefix = removeListMarker ? String.raw`(?:-\s+)?` : String.raw`(?:-\s+)?`;
  const regex = new RegExp(
    `^${prefix}<!-- added by (CF-\\d{4}) -->\\s*\\*\\*([^*]+?\\b(CH-\\d{4})[^*]*?)\\*\\*:\\s*([\\s\\S]*?)(?=\\n(?:-\\s+)?<!-- added by CF-\\d{4} -->|\\n#{2,3} |\\n---|$)`,
    "gm"
  );
  const extensions = [];
  for (const match of text.matchAll(regex)) {
    extensions.push({
      originating_cf: match[1],
      change_id: match[3],
      date: changeDates.get(match[3]) ?? "",
      label: normalizeExtensionLabel(match[2], match[3]),
      body: match[4].trim()
    });
  }
  return extensions;
}

function stripOpenQuestionControlLines(text) {
  return text
    .split(/\n/)
    .filter((line) => !/^- \*\*(When to resolve|Caution)\*\*:/.test(line.trim()))
    .join("\n")
    .replace(/(?:^|\n)-?\s*<!-- added by CF-\d{4} -->\s*\*\*[^*]+\*\*:[\s\S]*?(?=\n(?:-?\s*<!-- added by CF-\d{4} -->|## )|$)/g, "")
    .trim();
}

function normalizeExtensionLabel(label, changeId) {
  return label
    .replace(new RegExp(`\\s*\\(?${changeId}[^)]*\\)?\\s*`), " ")
    .replace(/\s+—\s+/, " — ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDifficulty(value) {
  const normalized = String(value ?? "").trim().replace(/\.$/, "").toLowerCase();
  return ["low", "medium", "high"].includes(normalized) ? normalized : "medium";
}

function normalizeStatus(value) {
  return String(value ?? "").trim().split(/[ (.]/)[0] || "active";
}

function normalizeSafety(value) {
  return String(value ?? "").trim().split(/[ .]/)[0] || "medium";
}

function listFromText(value) {
  const trimmed = String(value ?? "").trim().replace(/\.$/, "");
  return trimmed ? [trimmed] : [];
}

function splitDomains(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function idsInText(text, regex) {
  return [...new Set(text.match(regex) ?? [])];
}

function readWorldFile(fileName) {
  return readFileSync(path.join(worldDir, fileName), "utf8");
}

function writeSource(directory, fileName, contents) {
  writeFileSync(path.join(sourceDir, directory, fileName), contents);
}

function writeYaml(directory, fileName, record) {
  const document = new YAML.Document(record);
  document.contents.schema = "core";
  writeSource(directory, fileName, YAML.stringify(record, { lineWidth: 0 }));
}

main();
