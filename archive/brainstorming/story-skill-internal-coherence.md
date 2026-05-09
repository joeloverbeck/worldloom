# Internal Coherence Checker Skill for Story Skills

We recently have overhauled all the story skills:

.claude/skills/branching*
.claude/skills/story-fact-promotion-to-canon
.claude/skills/storylet-pool-authoring

However, we didn't rewrite all those skills from zero; instead, they were modified. I suspect that internal incoherences remain. Our intention is to create a skill that requires a Claude skill route as parameter. The skill should analyze all the skill files (including all reference documents) to figure out if there are internal incoherences, for example schema properties that fight against each other, contradictory instructions, etc. The skill should make the corrections itself.