import type { ChildOutcomeVariant } from "./child-outcome-variant.js";

export interface ChoiceNavigation {
  choiceId: string;
  surfaceLabel: string;
  playerVisibleIntent: string;
  pressure: string[];
  groundedInCount: number;
  childOutcomeVariants: ChildOutcomeVariant[];
  isNavigable: boolean;
}
