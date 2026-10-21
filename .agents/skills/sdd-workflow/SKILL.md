---
name: sdd-workflow
description: >-
  How spec-driven development actually runs in this workspace: the three tracks (Direct / Light /
  Full), which OpenSpec artifacts each track requires, and how the four human gates map onto the
  opsx workflows. Use this skill before starting ANY piece of work — it decides how much process the
  work earns. Trigger it whenever someone asks to build, fix, change, or add something, whenever you
  are about to run /opsx-propose or /opsx-apply, and whenever you are unsure whether a change needs
  a proposal at all.
---

# The SDD workflow

Specs are the contract for **what** gets built. This workspace is the contract for **how**.

The single most common failure of spec-driven development is process disproportionate to the change:
a one-line fix that arrives wearing four user stories and sixteen acceptance criteria. That is a real
cost, not a style complaint — every artifact is something a person has to read, and a reviewer who is
tired of reading markdown stops reading it carefully. So the first decision on any piece of work is
**not** "what does the spec say", it is **"which track is this?"**

## The three tracks

Pick the track **before** touching anything, state it out loud, and say why in one line. The human can
override it at Gate A; nobody else can.

| | **Track 0 — Direct** | **Track 1 — Light** | **Track 2 — Full** |
|---|---|---|---|
| **Use when** | Trivially reversible, no observable behavior change | One capability, no new interface, behavior change is obvious and local | New capability, cross-cutting, security/data-path, migration, or anything hard to reverse |
| **Examples** | Typo, comment, formatting, dependency bump with green tests | Add a field to an existing endpoint, fix a bug with a known cause, extend an existing rule | New service, new auth path, schema migration, public API, anything a user could be harmed by |
| **OpenSpec artifacts** | None | `proposal.md`, spec delta, `tasks.md` (skip `design.md`) | All four: `proposal.md`, spec delta, `design.md`, `tasks.md` |
| **Gates** | None — just do it, with a test | **B** and **C** | **A**, **B**, **C**, **D** |
| **Fleet** | Orchestrator alone, or `dev` | `dev` → `code-reviewer` → `qa` | The full fleet |

Three rules keep the tracks honest:

- **Escalate freely, downgrade never.** Any agent may raise a track when the work turns out to be
  bigger than it looked. Lowering a track is a human decision at a gate, because it removes a check.
- **Track 0 is not a loophole.** "Trivially reversible" means a revert fixes it completely and nobody
  could have relied on it in between. If you are arguing the case, it is Track 1.
- **Security, data loss, money, and identity are never below Track 2.** No matter how small the diff.

When the track is genuinely unclear, ask the human — one sentence, with your recommendation. Do not
default upward "to be safe": a Track 2 ceremony on Track 1 work trains everyone to skim.

## This workspace is spec-anchored

There are three levels a team can practice SDD at, and confusing them is where most arguments start:

1. **Spec-first** — specs are written before code, then discarded. Cheap; loses the spec's value the
   moment it lands.
2. **Spec-anchored** — specs are written before code and **kept**, evolving with the capability. ← *this workspace*
3. **Spec-as-source** — specs are the editable artifact and code is generated from them. Code is
   marked do-not-edit.

We are deliberately at level 2. `openspec/specs/` holds the living truth about what each capability
does; `openspec/changes/<name>/` holds a proposed delta to it; `openspec archive` folds an applied
delta back into the living spec. **Code remains a first-class, human-reviewed artifact.** Nobody
reviews a spec instead of reviewing the diff.

Level 3 is out of scope here on purpose. Generating code from prose combines the rigidity of
model-driven development with the non-determinism of a language model, and we would inherit the
downsides of both.

## The loop, end to end

```
   intent ──► TRACK ──► /opsx-propose ──► GATE B ──► /opsx-apply ──► review ──► GATE C
                 │         (+ test plan)                 (dev)                     │
              GATE A                                                            merge
           (Track 2 only)                                                          │
                                                                                  qa
                                                                                   │
                                                          GATE D ──► deploy ──► /opsx-archive
                                                        (Track 2 only)              │
                                                                          specs/ updated
```

**Step by step:**

1. **Intent.** A person says what they want. You restate it in one sentence and name the track.
2. **Gate A** *(Track 2)* — human confirms the intent, the track, and what is explicitly out of scope.
3. **`/opsx-propose`** — `architect` drives it. Produces `proposal.md`, the spec delta under
   `changes/<name>/specs/<capability>/spec.md`, `design.md` (Track 2), `tasks.md`. In parallel,
   `qa-manager` writes the test plan against the delta's acceptance criteria.
   *The propose workflow is planning-only. It does not edit project code, ever, even if the original
   request said "and then build it".*
4. **Gate B** — human approves the proposal, the spec delta, the design, and the test plan. **This is
   the highest-leverage gate in the whole loop.** A wrong spec approved here costs a hundred times
   what it costs to fix now.
5. **`/opsx-apply`** — `dev` implements `tasks.md` on one branch, with tests. `code-reviewer` reviews.
6. **Gate C** — human approves the merge. Delegable to the reviewer once trust is established.
7. **`qa`** verifies the merged feature against the acceptance criteria in the spec delta. A feature
   is verified when QA says so, not when the dev merges.
8. **Gate D** *(Track 2)* — human approves the deploy after `devops` has a green, gated pipeline.
9. **`/opsx-archive`** — folds the delta into `openspec/specs/` and moves the change to
   `changes/archive/`. **A change is not done until it is archived** — an applied-but-unarchived
   change means the living spec is now lying about the system.

## Where the CLI fits

| Question | Command |
|---|---|
| What is in flight? | `openspec list` |
| What capabilities exist? | `openspec list --specs` |
| What does this change still need? | `openspec status --change "<name>" --json` |
| Is it well formed? | `openspec validate "<name>"` |
| Show me everything | `openspec view` |
| Is the spec set healthy? | `openspec doctor` |

Run `openspec validate` before every gate. A gate presented with an invalid change wastes a human's
turn, and the whole point of a gate is that human attention is the scarcest thing in the loop.

## What a gate presentation looks like

Every gate gets the same four things, and nothing else:

1. **What was done** — one paragraph, no preamble.
2. **The evidence** — change name, artifact paths, `openspec validate` result, PR link, pipeline run.
3. **What happens next** if approved.
4. **Risks and open questions**, or the words "none".

Then stop and wait. A gate you answered yourself is not a gate.
