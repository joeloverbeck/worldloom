const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const worldDir = path.resolve(process.argv[2] ?? "worlds/animalia");
const sourceDir = path.join(worldDir, "_source");

const dirs = new Map([
  ["canon", { idField: "id", required: ["id", "title", "required_world_updates"] }],
  ["change-log", { idField: "change_id", required: ["change_id", "affected_fact_ids"] }],
  ["invariants", { idField: "id", required: ["id", "category", "statement", "extensions"] }],
  ["mystery-reserve", { idField: "id", required: ["id", "title", "disallowed_cheap_answers", "future_resolution_safety"] }],
  ["open-questions", { idField: "id", required: ["id", "topic", "body"] }],
  ["entities", { idField: "id", required: ["id", "canonical_name", "entity_kind", "aliases"] }],
  ["everyday-life", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }],
  ["institutions", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }],
  ["magic-or-tech-systems", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }],
  ["geography", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }],
  ["economy-and-resources", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }],
  ["peoples-and-species", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }],
  ["timeline", { idField: "id", required: ["id", "file_class", "heading", "body", "touched_by_cf"] }]
]);

const fileClassDirs = new Set([
  "everyday-life",
  "institutions",
  "magic-or-tech-systems",
  "geography",
  "economy-and-resources",
  "peoples-and-species",
  "timeline"
]);

const proseFileClasses = new Set([
  "EVERYDAY_LIFE",
  "INSTITUTIONS",
  "MAGIC_OR_TECH_SYSTEMS",
  "GEOGRAPHY",
  "ECONOMY_AND_RESOURCES",
  "PEOPLES_AND_SPECIES",
  "TIMELINE"
]);

const allowedFileClasses = new Set([
  "CANON_LEDGER",
  "INVARIANTS",
  "MYSTERY_RESERVE",
  "OPEN_QUESTIONS",
  "ONTOLOGY",
  "WORLD_KERNEL",
  ...proseFileClasses
]);

const records = [];
const byId = new Map();
const failures = [];

for (const [dir, spec] of dirs) {
  const absoluteDir = path.join(sourceDir, dir);
  if (!fs.existsSync(absoluteDir)) {
    failures.push(`missing directory: _source/${dir}`);
    continue;
  }

  for (const fileName of fs.readdirSync(absoluteDir).filter((name) => name.endsWith(".yaml")).sort()) {
    const relativePath = path.posix.join("_source", dir, fileName);
    const absolutePath = path.join(absoluteDir, fileName);
    let parsed;
    try {
      parsed = YAML.parse(fs.readFileSync(absolutePath, "utf8"));
    } catch (error) {
      failures.push(`yaml_parse_integrity: ${relativePath}: ${error.message}`);
      continue;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      failures.push(`record_schema_compliance: ${relativePath}: record is not a mapping`);
      continue;
    }

    for (const field of spec.required) {
      if (!(field in parsed)) {
        failures.push(`record_schema_compliance: ${relativePath}: missing ${field}`);
      }
    }

    const id = parsed[spec.idField];
    if (typeof id !== "string" || id.length === 0) {
      failures.push(`record_schema_compliance: ${relativePath}: missing string ${spec.idField}`);
      continue;
    }
    if (byId.has(id)) {
      failures.push(`id_uniqueness: duplicate id ${id} in ${relativePath} and ${byId.get(id).relativePath}`);
    }
    const record = { id, dir, relativePath, data: parsed };
    byId.set(id, record);
    records.push(record);
  }
}

for (const record of records) {
  const data = record.data;
  if (record.dir === "canon") {
    for (const fileClass of asArray(data.required_world_updates)) {
      if (!allowedFileClasses.has(fileClass)) {
        failures.push(`cross_file_reference: ${record.relativePath}: unknown required_world_updates value ${fileClass}`);
      }
    }
    for (const cfId of asArray(data.source_basis?.derived_from)) {
      if (/^CF-\d{4}$/.test(cfId) && !byId.has(cfId)) {
        failures.push(`cross_file_reference: ${record.relativePath}: missing derived_from ${cfId}`);
      }
    }
    for (const entry of asArray(data.modification_history)) {
      if (entry?.change_id && !byId.has(entry.change_id)) {
        failures.push(`cross_file_reference: ${record.relativePath}: missing modification_history ${entry.change_id}`);
      }
    }
  }

  if (record.dir === "change-log") {
    if (data.originating_cf && !byId.has(data.originating_cf)) {
      failures.push(`cross_file_reference: ${record.relativePath}: missing originating_cf ${data.originating_cf}`);
    }
    for (const cfId of asArray(data.affected_fact_ids)) {
      if (!byId.has(cfId)) {
        failures.push(`cross_file_reference: ${record.relativePath}: missing affected_fact_ids ${cfId}`);
      }
    }
  }

  for (const extension of asArray(data.extensions)) {
    if (extension?.originating_cf && !byId.has(extension.originating_cf)) {
      failures.push(`cross_file_reference: ${record.relativePath}: missing extension originating_cf ${extension.originating_cf}`);
    }
    if (extension?.change_id && !byId.has(extension.change_id)) {
      failures.push(`cross_file_reference: ${record.relativePath}: missing extension change_id ${extension.change_id}`);
    }
  }

  if (fileClassDirs.has(record.dir)) {
    if (!allowedFileClasses.has(data.file_class)) {
      failures.push(`record_schema_compliance: ${record.relativePath}: invalid file_class ${data.file_class}`);
    }
    for (const cfId of asArray(data.touched_by_cf)) {
      if (!byId.has(cfId)) {
        failures.push(`cross_file_reference: ${record.relativePath}: missing touched_by_cf ${cfId}`);
      }
    }
  }
}

for (const cf of records.filter((record) => record.dir === "canon")) {
  for (const fileClass of asArray(cf.data.required_world_updates)) {
    if (!proseFileClasses.has(fileClass)) {
      continue;
    }
    const hasSection = records.some(
      (record) =>
        fileClassDirs.has(record.dir) &&
        record.data.file_class === fileClass &&
        asArray(record.data.touched_by_cf).includes(cf.id)
    );
    if (!hasSection) {
      failures.push(`touched_by_cf_completeness: ${cf.id} required_world_updates includes ${fileClass}, but no SEC record lists it`);
    }
  }
}

if (failures.length > 0) {
  console.error(`SPEC-13 validation failed (${failures.length})`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`SPEC-13 validation passed: ${records.length} records, ${byId.size} unique IDs`);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}
