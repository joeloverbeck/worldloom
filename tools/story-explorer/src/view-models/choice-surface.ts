export interface ChoiceSurfaceChoice {
  choiceId: string;
  surfaceLabel: string;
  playerVisibleIntent: string;
  pressure: string[];
  groundedInCount: number;
}

export interface ChoiceSurface {
  pageId: string;
  emittedChoices: ChoiceSurfaceChoice[];
}
