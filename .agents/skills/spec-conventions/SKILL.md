---
name: spec-conventions
description: >-
  Planning and authoring conventions for OpenSpec changes and capability specs — change naming,
  capability layout, acceptance-criteria format, delta discipline, dependency ordering, scope
  control, and traceability from spec to commit to release. Use this skill whenever creating,
  grooming, ordering, or closing work: writing a proposal, authoring or editing a spec delta,
  writing acceptance criteria, sizing tasks, deciding what is out of scope, or archiving a change.
  Trigger it any time someone plans or tracks work in this workspace, even if OpenSpec is not
  mentioned by name.
---

# Spec conventions

`openspec/` is the **single source of truth for planning**. There is no separate tracker: a change
directory *is* the ticket, the spec *is* the requirement, and `git` carries the rest. Consistent
structure here is what makes traceability real instead of aspirational.

**Never invent identifiers.** Change names, capability paths, and ADR numbers must be real — read
them with `openspec list`, `openspec list --specs`, and `ls docs/adr/` before quoting them. A
fabricated reference poisons the audit trail. It is the easiest thing for a reviewer to catch and the
easiest thing for everyone downstream to trust by mistake.

## Two kinds of document, and the difference matters

| | `openspec/specs/<capability>/spec.md` | `openspec/changes/<name>/specs/<capability>/spec.md` |
|---|---|---|
| **Is** | The living truth: what the capability does **today** | A **delta**: what this change adds, modifies, or removes |
| **Tense** | Present, declarative — "The service resolves…" | Additive — the requirements being introduced or changed |
| **Written by** | Nobody directly — produced by `openspec archive` | `architect`, during `/opsx-propose` |
| **Edited by hand** | Only to correct drift, never as part of a change | Freely, until Gate B approves it |

The commonest and most expensive mistake is writing the whole capability spec into the delta. A delta
that restates unchanged behavior makes the archive fold in duplicates, and the living spec quietly
becomes unreadable. **Write only what changes.**

## Change names

Kebab-case, verb-first, 2–5 words, naming the outcome rather than the mechanism.

```
add-user-auth            refactor-session-store       fix-token-refresh-race
remove-legacy-export     migrate-registry-to-jsonb
```

Not `update-stuff`, not a bare ticket number, not a person's name. The change name appears in the
directory, the branch, the commits, and the release notes — it is the thread that ties them together,
so it has to read sensibly to someone who arrives a year later with no context.

## Capability paths

A capability is a coherent thing the system does, named for the behavior and not for the module that
implements it. Nest only where nesting earns its keep.

```
specs/user-auth/spec.md
specs/identity/token-exchange/spec.md
specs/billing/invoicing/spec.md
```

**Preserve an existing capability's full path exactly.** A change that invents `specs/auth/` alongside
an existing `specs/user-auth/` splits the living spec in two, and nothing in the tooling will tell you
it happened.

## Acceptance criteria

Write them so QA can turn each line into a test and a reviewer can check it objectively without asking
you what you meant. Prefer Given/When/Then, or a checkable list where that shape does not fit.

Every criterion must be **observable from outside the code**. "The service handles errors gracefully"
is not a criterion, it is a wish. "A malformed payload returns 422 with no stack trace in the body" is
a criterion.

```markdown
#### Scenario: Data is fetched as the signed-in user

- **GIVEN** an authenticated session
- **WHEN** the client requests a record it is entitled to
- **THEN** the upstream call carries that user's identity, not a service credential
- **AND** an audit event is emitted carrying the user identity and the request's trace id

Measurable: p50 latency under 50 ms on the reference dataset.
Out of scope: bulk export (tracked separately as `add-bulk-export`).
```

Three things earn their place in every set of criteria:

- **A measurable bar** wherever one exists — a latency, a coverage number, a rate, a time limit. A
  criterion with no number in it can be argued about forever.
- **An explicit out-of-scope line.** The cheapest scope control there is, and it survives into the
  archive where a later reader needs it.
- **Provenance when the criterion came from somewhere.** If it was copied from a stakeholder document,
  say so. If you authored it, mark it authored, so nobody later mistakes your judgment for someone
  else's requirement.

## Tasks

`tasks.md` is for the implementer, not for the archive. Each task is a chunk a competent dev finishes
in about half a day, phrased as an action, ordered so each one leaves the tree green.

- Name the files or modules where known. "Explore the codebase" is not a task — that discovery belongs
  to the proposal phase, and leaving it as a task means the planning was not finished.
- Split anything that cannot fit one focused PR, and say so in the proposal rather than letting the
  branch sprawl.
- Tests are not a task at the end. They belong to the task that introduces the behavior.

## Dependency order and scope

- **Order by dependency, not by enthusiasm.** When one change must land before another, say so in
  `proposal.md` under an explicit "Depends on" line naming the other change. The orchestrator reads
  that to sequence work; nothing else does it for you.
- **Concurrent lanes are normal.** Several changes may be in flight at once. Within one capability,
  one change at a time — two open deltas against the same spec will collide at archive.
- **The scope rule:** *if it is not in the acceptance criteria, it is not in this change.* Measure
  every late addition against it. Reject it, or split it into its own change and link it — never
  absorb it silently, and never let a change grow past the proposal a human approved at Gate B.

## Traceability by construction

Traceability lives in specs, branches, commits, PRs, and releases — **never in source comments**.

| Link | Where it lives |
|---|---|
| Change ⇄ branch | `<type>/<change-name>` |
| Change ⇄ commits | Change name in the commit subject or a trailer |
| Change ⇄ PR | PR title and body name the change and link its directory |
| Change ⇄ capability | The delta path under `changes/<name>/specs/` |
| Change ⇄ decision | `proposal.md` cites the ADR; the ADR cites the change |
| Release ⇄ changes | Release notes list the change names it ships |

Code carries no change names, no gate references, and no change history. It must read cleanly to
someone with access to none of this. ADR citations are the one exception, used sparingly and only
where the code directly encodes that decision.

## Archiving

`openspec archive "<name>"` folds the delta into the living spec and moves the change to
`changes/archive/`. Before you run it:

1. Every task in `tasks.md` is done, or explicitly dropped with the reason recorded in the proposal.
2. QA verified the feature against the acceptance criteria — not the dev, and not the merge.
3. `openspec validate "<name>"` passes.
4. The delta says what actually shipped. If the implementation diverged from the spec, **the spec is
   corrected to match reality before archiving.** An archive that folds in a spec nobody implemented
   is worse than no spec at all, because the next reader will believe it.

Then run `openspec doctor` and read what it says. An applied change left unarchived, and a spec that
has drifted from the code, are the two ways this system rots — and both are quiet.
