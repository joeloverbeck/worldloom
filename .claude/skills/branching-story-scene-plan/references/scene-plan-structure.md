# Scene Plan Structure

Use this reference during Phase 3 of `branching-story-scene-plan`.

## Body Contract

The scene plan is a novelist-facing prompt over a committed `PG` range. Its non-verbatim body must be clean prose direction:

- no record ids
- no hashes
- no schema terms
- no validator names
- no patch-engine language
- no lifecycle terms such as `supersedes`
- no raw state-delta vocabulary
- no act, arc, midpoint, climax, rising action, or target narrative shape language

Translate state into renderable human facts. For example, use "she realizes the door was watched" rather than a `BEL` id, and "the pressure of being seen tightens" rather than a clock id.

## Required Sections

The validator recognizes these section names:

1. `# Scene: <Title>`
2. `## 2. Content Policy`
3. `## 3. Prose Craft Contract`
4. `## 4. Render Mission`
5. `## 5. What Changes in This Scene`
6. `## 6. Where the Scene Begins / Must End`
7. `## 7. Beat Chain`
8. `## 8. POV / Observer Firewall`
9. `## 9. Cast & Voice`
10. `## 10. Emotional / Relationship Throughline`
11. `## 11. Physical Continuity`
12. `## 12. Secrets & Forbidden Reveals`
13. `## 13. Choice Surface`
14. `## 19. Render-Time Instruction`

Sections 2, 3, and 19 are byte-equal canonical blocks. Do not summarize or paraphrase them.

## Section Guidance

`Render Mission`: Name the opening state and stopping point in natural language.

`What Changes in This Scene`: Describe the emotional, relational, practical, and informational turn across the range. Compression is allowed; skipping load-bearing committed causality is not.

`Where the Scene Begins / Must End`: Give concrete image, cast positions, and final dramatic condition. The final condition must match the end page's choice surface.

`Beat Chain`: Translate each included `PG`'s required event/effect into renderer-facing beats. Do not include ids.

`POV / Observer Firewall`: State what the POV may know, infer, misread, or not know.

`Cast & Voice`: Use STCHAR-derived voice and conduct constraints in plain language.

`Secrets & Forbidden Reveals`: Include forbidden mystery resolutions and protected unknowns in prose-facing wording.

`Choice Surface`: State what the reader can now choose at scene end. Use labels or rendered options, not raw `CHC` ids.
