// Translator registry for the Manual Studio prompt composer.
//
// Each translator is a pure function that lowers one Manual Studio record
// into a novelist-facing prose fragment. The context arg lets translators
// resolve cross-record title lookups (e.g., relationship "between[0]" id
// to that cast member's title) without smuggling I/O into the translator
// itself — the lookup tables are populated upstream in compose.ts before
// any section emitter runs.
//
// Registrations are populated by the bundle translators in
// SPEC102PROCOMREN-003 / -004 / -005. The registry is a Partial because
// downstream tests can import the empty registry at boot time before the
// bundle modules are imported.

import type {
  ManualRecord,
  ManualRecordClass,
  ManualRecordOfClass,
} from "../../schema/manual-story.js";

export interface TranslatorContext {
  // Returns the `title` of a cast record (mchar-N), or null if not loaded.
  getCastTitle(id: string): string | null;
  // Returns the `title` of any loaded record, or null if not loaded.
  getRecordTitle(id: string): string | null;
}

export type RecordTranslator<C extends ManualRecordClass> = (
  record: ManualRecordOfClass<C>,
  ctx: TranslatorContext,
) => string;

export type AnyRecordTranslator = (
  record: ManualRecord,
  ctx: TranslatorContext,
) => string;

export const translatorRegistry: Partial<
  Record<ManualRecordClass, AnyRecordTranslator>
> = {};

export function registerTranslator<C extends ManualRecordClass>(
  recordClass: C,
  translator: RecordTranslator<C>,
): void {
  translatorRegistry[recordClass] = translator as AnyRecordTranslator;
}

export function getTranslator(
  recordClass: ManualRecordClass,
): AnyRecordTranslator | undefined {
  return translatorRegistry[recordClass];
}
