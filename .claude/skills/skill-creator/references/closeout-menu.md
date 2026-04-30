# Closeout — Next-Steps Menu (Step 8)

```
Skill written to .claude/skills/<slug>/SKILL.md
<list any templates/examples written>
<note archive move if applicable>

What would you like to do next?
1. Invoke the new skill to test it on real input
2. Create another skill from a different proposal
3. Run `skill-audit` on the new skill (structural audit, no invocation)
[N]. Run `skill-audit` on `<downstream-sibling>` to address <out-of-scope concern>   [conditional — only appears when out-of-scope concerns were raised during the interview per the gap-filler interview §Out-of-scope concerns raised during interview]
<N+1>. Done for now — I'll review the skill file later
```

**Conditional out-of-scope-concern option**: If the user raised a concern about a downstream sibling skill during the gap-filler interview (per the gap-filler interview §Out-of-scope concerns raised during interview), insert a menu item naming that sibling and the concern. The item's purpose is to give the user a concrete follow-up path without re-typing the concern from scratch. Omit the item entirely when no out-of-scope concerns were raised. The numbering shifts: "Done for now" is always the last item.

If the user invokes a sibling skill, the session ends cleanly — skill-creator does not chain.
