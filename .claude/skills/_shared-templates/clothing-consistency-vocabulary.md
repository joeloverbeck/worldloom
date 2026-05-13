# Clothing Consistency Vocabulary

Closed vocabulary for post-LLM `cast_material_reality_consistency` checks in
the story-pipeline skills (rebuilt family per
`docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`).

The check is deterministic. It scans only plan-authored affordance and cast
intention prose, matches the literal garment-kind and posture tokens below, and
compares them to the projected CHAR dossier `body.Material Reality` summary for
the mapped cast member. It does not perform fuzzy semantic matching.

## Garment-Kind Tokens

Primary garment/accessory tokens:

- sleeve
- hood
- pocket
- lapel
- collar
- hem
- cuff
- button
- zipper
- belt
- scarf
- tie
- jacket-tail
- skirt-fold
- sock
- stocking
- glove
- hat
- cap
- helmet
- veil
- bandana
- headband
- headscarf
- kerchief
- brooch
- pin
- watch
- bracelet
- necklace
- earring
- ring

## Parent-Garment Mapping

A detected token passes when at least one listed parent or synonym appears in
the cast member's Material Reality clothing / possessions summary. Operators
may count obvious plural and hyphenation variants of the exact words below.

| Token | Parent garment or synonym evidence |
|---|---|
| sleeve | shirt, blouse, sweater, sweatshirt, hoodie, jacket, coat, dress, robe, tunic |
| hood | hoodie, hooded sweatshirt, jacket, coat, robe, cape, cloak |
| pocket | pants, trousers, jeans, shorts, skirt, dress, jacket, coat, vest, apron, bag |
| lapel | jacket, blazer, coat, suit |
| collar | shirt, blouse, jacket, coat, dress, robe, tunic, uniform |
| hem | shirt, blouse, sweater, jacket, coat, dress, skirt, robe, tunic, pants, trousers, shorts |
| cuff | shirt, blouse, sweater, sweatshirt, jacket, coat, glove, pants, trousers |
| button | shirt, blouse, jacket, coat, dress, cardigan, vest, pants, trousers |
| zipper | jacket, coat, hoodie, sweatshirt, pants, trousers, jeans, dress, skirt, bag |
| belt | belt, sash, girdle, strap |
| scarf | scarf, shawl, wrap |
| tie | tie, necktie, cravat, ribbon |
| jacket-tail | jacket, coat, blazer, tailcoat |
| skirt-fold | skirt, dress, kilt |
| sock | sock, socks |
| stocking | stocking, stockings, tights, hose |
| glove | glove, gloves |
| hat | hat |
| cap | cap |
| helmet | helmet |
| veil | veil |
| bandana | bandana |
| headband | headband |
| headscarf | headscarf, scarf |
| kerchief | kerchief, neckerchief, bandana |
| brooch | brooch, pin |
| pin | pin, brooch |
| watch | watch |
| bracelet | bracelet, bangle |
| necklace | necklace, chain, pendant |
| earring | earring, earrings |
| ring | ring |

## Posture Tokens

Posture tokens are secondary. They trigger only when the projected Material
Reality condition explicitly contradicts the motion or stance.

- stands
- walks
- kneels
- crouches
- runs
- sits
- lies
- leans
- climbs
- jumps

Condition contradiction examples:

- `stands`, `walks`, `runs`, `climbs`, or `jumps` contradicts conditions such
  as immobile, bedridden, cannot stand, wheelchair-bound, or seated-only.
- `kneels` or `crouches` contradicts conditions such as cannot bend, leg
  immobilized, or seated-only.
- `sits` contradicts only an explicit cannot sit / must remain standing
  condition.
- `lies` contradicts only an explicit cannot lie down / must remain upright
  condition.
- `leans` is normally allowed unless Material Reality explicitly forbids
  weight shifting or support-seeking.

Generic anatomy references such as shoulder, hand, arm, bruise, face, or body
are not garment-kind tokens and should not fail this check by themselves.
