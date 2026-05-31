import type { ManualCharacterRecord } from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

function paragraph(label: string, body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "";
  return `**${label}:** ${trimmed}`;
}

function bulletList(items: string[]): string {
  return items
    .map((item) => `- ${item.trim()}`)
    .filter((line) => line.trim().length > 2)
    .join("\n");
}

function identityBlock(record: ManualCharacterRecord): string {
  const lines = [
    paragraph("One line", record.identity.one_line),
    paragraph("Public face", record.identity.public_face),
    paragraph("Private pressure", record.identity.private_pressure),
  ].filter((s) => s.length > 0);
  return lines.length > 0 ? `**Identity**\n\n${lines.join("\n\n")}` : "";
}

function worldPressureBlock(record: ManualCharacterRecord): string {
  const c = record.world_pressure_core;
  const lines = [
    paragraph("World-produced wound", c.world_produced_wound),
    paragraph("Active appetite", c.active_appetite),
    paragraph("Self-mythology", c.self_mythology),
    paragraph("Irreconcilable contradiction", c.irreconcilable_contradiction),
    paragraph("Relational charge", c.relational_charge),
    paragraph("Moral/psychological edge", c.moral_psychological_edge),
    paragraph(
      "Cannot be swapped out because",
      c.cannot_be_swapped_out_because,
    ),
  ].filter((s) => s.length > 0);
  return lines.length > 0
    ? `**World pressure core**\n\n${lines.join("\n\n")}`
    : "";
}

function voiceBlock(record: ManualCharacterRecord): string {
  const v = record.voice;
  const lines = [
    paragraph("Baseline", v.baseline),
    paragraph("Under pressure", v.under_pressure),
    paragraph("Intimacy", v.intimacy),
    paragraph("Evasion", v.evasion),
    paragraph("Anger", v.anger),
    paragraph("Lying", v.lying),
  ].filter((s) => s.length > 0);
  let block = lines.length > 0 ? `**Voice**\n\n${lines.join("\n\n")}` : "";
  if (v.anti_generic_warnings.length > 0) {
    const warnings = bulletList(v.anti_generic_warnings);
    if (warnings.length > 0) {
      block += `\n\n*Anti-generic warnings:*\n${warnings}`;
    }
  }
  return block.trim();
}

function bodyAndPresenceBlock(record: ManualCharacterRecord): string {
  const b = record.body_and_presence;
  const lines = [
    paragraph("Physicality", b.physicality),
    paragraph("Body limits", b.body_limits),
    paragraph("Habitual gestures", b.habitual_gestures),
    paragraph("Clothing/presentation", b.clothing_or_presentation),
    paragraph("Social presentation", b.social_presentation),
  ].filter((s) => s.length > 0);
  return lines.length > 0
    ? `**Body and presence**\n\n${lines.join("\n\n")}`
    : "";
}

function pressureBehaviorBlock(record: ManualCharacterRecord): string {
  const p = record.pressure_behavior;
  const lines = [
    paragraph("Cornered", p.cornered),
    paragraph("Tempted", p.tempted),
    paragraph("Humiliated", p.humiliated),
    paragraph("Protecting attachment", p.protecting_attachment),
    paragraph("Offered power", p.offered_power),
  ].filter((s) => s.length > 0);
  return lines.length > 0
    ? `**Pressure behavior**\n\n${lines.join("\n\n")}`
    : "";
}

function perceptionBlock(record: ManualCharacterRecord): string {
  const p = record.perception_and_embodiment;
  const lines = [
    paragraph("Notices", p.notices),
    paragraph("Misses", p.misses),
    paragraph("Misreads", p.misreads),
    paragraph("Sensory bias", p.sensory_bias),
  ].filter((s) => s.length > 0);
  return lines.length > 0
    ? `**Perception and embodiment**\n\n${lines.join("\n\n")}`
    : "";
}

function agencyBlock(record: ManualCharacterRecord): string {
  const a = record.agency_and_planning;
  const lines = [
    paragraph("Default strategy", a.default_strategy),
    paragraph("Risk style", a.risk_style),
    paragraph("Fallback style", a.fallback_style),
    paragraph("Planning blind spots", a.planning_blind_spots),
  ].filter((s) => s.length > 0);
  return lines.length > 0
    ? `**Agency and planning**\n\n${lines.join("\n\n")}`
    : "";
}

function relationshipsBlock(
  record: ManualCharacterRecord,
  ctx: TranslatorContext,
): string {
  const entries = Object.entries(record.relationship_behavior).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  if (entries.length === 0) return "";
  const lines = entries.map(([key, behavior]) => {
    const resolvedTitle = ctx.getCastTitle(key) ?? ctx.getRecordTitle(key);
    const label = resolvedTitle ?? key;
    return `- *Toward ${label}:* ${behavior.trim()}`;
  });
  return `**Relationships**\n\n${lines.join("\n")}`;
}

function proseConstraintsBlock(record: ManualCharacterRecord): string {
  const c = record.prose_constraints;
  const sections: string[] = [];
  if (c.prose_must_not_imply.length > 0) {
    sections.push(
      `*Prose must not imply:*\n${bulletList(c.prose_must_not_imply)}`,
    );
  }
  if (c.forbidden_inventions.length > 0) {
    sections.push(
      `*Forbidden inventions:*\n${bulletList(c.forbidden_inventions)}`,
    );
  }
  if (c.voice_do_not_do.length > 0) {
    sections.push(`*Voice — do not do:*\n${bulletList(c.voice_do_not_do)}`);
  }
  return sections.length > 0
    ? `**Prose constraints**\n\n${sections.join("\n\n")}`
    : "";
}

export const castTranslator = (
  record: ManualCharacterRecord,
  ctx: TranslatorContext,
): string => {
  const heading = `### ${record.title}`;
  const blocks = [
    identityBlock(record),
    worldPressureBlock(record),
    voiceBlock(record),
    bodyAndPresenceBlock(record),
    pressureBehaviorBlock(record),
    perceptionBlock(record),
    agencyBlock(record),
    relationshipsBlock(record, ctx),
    proseConstraintsBlock(record),
  ].filter((s) => s.length > 0);
  return `${heading}\n\n${blocks.join("\n\n")}`;
};

registerTranslator("cast", castTranslator);
