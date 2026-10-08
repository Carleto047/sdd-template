---
name: quality-lens
description: >
  The rubric for a silent quality pass on generated UI code: critique, product
  copy, accessibility, usability heuristics. Use after generating or changing a
  screen and before showing it to the user — run it in a subagent if your setup
  has one available, inline otherwise. Produces fixes applied to the code,
  never a report, never a severity table, never a document.
---

# Quality lens

An internal lens applied while building. The person you built this for asked for a working screen, not a review — so this pass produces **fixes in the code**, and what reaches them is the improved screen, nothing else.

If your project delegates code-writing work to a subagent, run this pass there rather than in the main conversation — it keeps severities, `path:line` evidence, and heuristic names out of a thread meant for plain conversation. If there is no subagent to delegate to, apply it inline, but still do not narrate it.

If this project has its own design system or token layer, that is the visual authority — nothing here may override an existing token, color, spacing scale, or component convention. Where a fix in this rubric would need a value the project doesn't have, that's a gap to name, not to invent.

## What this is not

- **Not a report.** No sections, no severity tables, no score, no summary. Do not write findings to the thread.
- **Not a document.** No design-docs file, no critique file, no artifact of any kind.
- **Not visual invention.** Every fix lands on an existing token, variable, or component if the project has one. If the fix needs a value the project doesn't define, that's a gap to name — not to fill.
- **Not announced.** Don't tell the user that a review is happening.

## When it runs

- After generating a first version, before showing it.
- After a batch of adjustments, before calling the work done.
- When something looks wrong to you and you cannot say why.

Skip it for a single trivial change. Running the full lens on a one-line copy fix wastes the turn.

## The finding contract, kept internally

| Requirement | Rule |
|---|---|
| **Evidence** | `path:line`, a snippet, or a named region. **No evidence, no finding.** |
| **Observation** | A concrete fact: count it, name the color, quote the text. |
| **Impact** | How it affects the person using the screen. |
| **Direction** | What to change and why. Never "change X" with no reason. |
| **Priority** | Blocking > friction > quality > polish. Fix in that order. |

**Be critical.** Look for real problems; do not soften and do not pad with weak issues to feel thorough.

**Empty is a real answer.** If there is nothing material, there is nothing material — do not invent problems to justify the pass. That conclusion stays internal: don't announce "nothing to report," just move on.

## The three lenses

Pick by what changed. Do not run all three by reflex.

### 1. Critique

Read [`references/critique.md`](references/critique.md) and follow it end to end as an internal checklist: first impressions, visual design, interface design, consistency, user context, and the ten usability heuristics.

**Don't shrink the rubric to the archetype in front of you.** A generated screen can be a dashboard, a chat surface, an approval flow, or a document view. The interaction-heavy heuristics — exits from unwanted states, prevention before irreversible actions, recovery from failure — matter most precisely in the flows that aren't a read-only board, and judging against a trimmed list is how coverage degrades without anyone deciding to degrade it.

Findings that recur in generated screens: everything competing for attention equally, density that doesn't match the surface, missing empty and loading states, no marked exit from a multi-step flow, and labels repeating what the title already said.

### 2. Product copy

Criteria: clarity, tone, precision, consistent terms, an unmistakable action.

**Never leave a diagnosis without a replacement.** Propose the finished string, don't describe what it should say.

Match voice to the audience the screen is for — if you don't know it, default to precise, direct, no filler, no emoji.

### 3. Accessibility

Read [`references/accessibility-check.md`](references/accessibility-check.md) and follow it end to end.

Say plainly if anyone asks: this is a first-pass filter, not formal compliance, and it does not replace tooling or user testing.

## After the pass

1. Fix what is relevant to what you just built.
2. Do not over-fix. Something unrelated and pre-existing is not this pass's business.
3. Do not report what you fixed. If you're returning from a subagent, keep the return narrow — a `changed: yes|no` plus at most one plain-language line, never a findings list.

Point 3 is the load-bearing one if you're running this behind a delegation boundary: a findings list handed back to the caller puts the whole rubric back into its context.

## Limits

- Never invent a feature during critique.
- **Never ask the user anything.** This pass runs silently. High-impact ambiguity: pick the safer default, apply it, and note the gap only in whatever internal return contract you already use (a `changed`/`out_of_scope`-style line back to the caller, a code comment on a genuine unknown) — never a question back to the person waiting for the result.
- Never contradict an existing design system. If the lens wants a different color, spacing, or motion than the project's tokens give, the tokens win.
