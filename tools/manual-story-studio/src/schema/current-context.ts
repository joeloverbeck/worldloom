// Author-controlled per-story selector for the cockpit's current point of view
// onto a manual story's record corpus.

export interface CurrentContext {
  current_location: string | null; // mloc-<n> or null
  current_cast: string[]; // ordered list of mchar-<n>
  pov_holder: string | null; // mchar-<n>; one of current_cast when set
  active_pressure_clocks: string[]; // mclock-<n>
  active_secrets_questions: string[]; // msecret-<n> or mq-<n>
  pinned_records: string[]; // typed mixed IDs from any manual record class
  must_not_reveal: string[]; // subset of active_secrets_questions or any msecret-<n>
  current_handoff_summary: string; // author's "what's happening right now"
  last_accepted_segment: string | null; // SEG-<n>
  // Whole-story state-review attestation used by the SPEC-108 repair precondition.
  last_reviewed_after_segment: string | null; // SEG-<n>
}
