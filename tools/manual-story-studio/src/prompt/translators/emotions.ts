import type {
  ManualEmotionIntensity,
  ManualEmotionRecord,
  ManualEmotionValence,
} from "../../schema/manual-story.js";
import { registerTranslator, type TranslatorContext } from "./index.js";

function valenceWord(v: ManualEmotionValence): string {
  switch (v) {
    case "positive":
      return "warm";
    case "mixed":
      return "mixed";
    case "negative":
      return "fraught";
  }
}

function intensityWord(i: ManualEmotionIntensity): string {
  switch (i) {
    case "mild":
      return "mildly";
    case "moderate":
      return "moderately";
    case "strong":
      return "strongly";
    case "overwhelming":
      return "overwhelmingly";
  }
}

export const emotionsTranslator = (
  record: ManualEmotionRecord,
  ctx: TranslatorContext,
): string => {
  const holderTitle = ctx.getCastTitle(record.holder) ?? record.holder;
  const body = record.details.trim() || record.summary.trim() || record.title;
  return `- ${holderTitle} feels ${intensityWord(record.intensity)} ${valenceWord(record.valence)}: ${body}`;
};

registerTranslator("emotions", emotionsTranslator);
