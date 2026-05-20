import type { NodeType } from "../schema/types.js";

export interface StorySourceDirectorySpec {
  directory: string;
  nodeType: NodeType;
  idField: string;
  idPatternSource: string;
}

export const STORY_SOURCE_DIRECTORY_SPECS = [
  storySourceDirectorySpec("entities", "story_entity_record", "id", "^STENT-[0-9]+$"),
  storySourceDirectorySpec("status", "story_status_record", "id", "^STSTAT-[0-9]+$"),
  storySourceDirectorySpec("beliefs", "belief_record", "id", "^BEL-[0-9]+$"),
  storySourceDirectorySpec("facts", "story_fact_record", "id", "^SF-[0-9]+$"),
  storySourceDirectorySpec("obligations", "obligation_record", "id", "^OBL-[0-9]+$"),
  storySourceDirectorySpec("consequences", "consequence_record", "id", "^CNSQ-[0-9]+$"),
  storySourceDirectorySpec("threads", "thread_record", "id", "^THR-[0-9]+$"),
  storySourceDirectorySpec("relationships", "relationship_record_story", "id", "^SREL-[0-9]+$"),
  storySourceDirectorySpec("intentions", "intention_record", "id", "^STINT-[0-9]+$"),
  storySourceDirectorySpec("locations", "story_location_record", "id", "^STLOC-[0-9]+$"),
  storySourceDirectorySpec("objects", "story_object_record", "id", "^STOBJ-[0-9]+$"),
  storySourceDirectorySpec("branches", "branch_record", "id", "^BR-[0-9]+$"),
  storySourceDirectorySpec("pages", "page_record", "id", "^PG-[0-9]+$"),
  storySourceDirectorySpec("choices", "choice_record", "id", "^CHC-[0-9]+$"),
  storySourceDirectorySpec("storylets", "storylet_record", "id", "^SLT-[0-9]+$"),
  storySourceDirectorySpec("clocks", "pressure_clock_record", "id", "^CLK-[0-9]+$"),
  storySourceDirectorySpec("secrets", "story_secret_record", "id", "^STSEC-[0-9]+$"),
  storySourceDirectorySpec("story-questions", "story_question_record", "id", "^STQ-[0-9]+$"),
  storySourceDirectorySpec("artifacts", "story_diegetic_artifact_record", "id", "^DA-[0-9]+$"),
  storySourceDirectorySpec("plans", "story_plan_record", "id", "^STPLAN-[0-9]+$"),
  storySourceDirectorySpec("emotions", "story_emotion_record", "id", "^STEMO-[0-9]+$"),
  storySourceDirectorySpec("events", "story_event_record", "id", "^SE-[0-9]+$")
] as const;

export const STORY_SOURCE_DIRECTORIES = STORY_SOURCE_DIRECTORY_SPECS.map(
  ({ directory }) => directory
);

function storySourceDirectorySpec(
  directory: string,
  nodeType: NodeType,
  idField: string,
  idPatternSource: string
): StorySourceDirectorySpec {
  return {
    directory,
    nodeType,
    idField,
    idPatternSource
  };
}
