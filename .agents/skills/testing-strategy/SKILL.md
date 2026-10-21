---
name: testing-strategy
description: Design test strategies and test plans. Trigger with "how should we test", "test strategy for", "write tests for", "test plan", "what tests do we need", or when the user needs help with testing approaches, coverage, or test architecture — and whenever writing a technical approach, an acceptance criterion, or a test plan that prescribes a guard, an observable, or a mutation.
---

# Testing strategy

Design effective testing strategies balancing coverage, speed, and maintenance.

## The pyramid

```
        /  E2E  \          Few, slow, high confidence
       / Integration \     Some, medium speed
      /    Unit tests  \   Many, fast, focused
```

## Strategy by component type

- **API endpoints** — unit tests for business logic, integration tests for the HTTP layer, contract
  tests for consumers
- **Data pipelines** — input validation, transformation correctness, idempotency
- **Frontend** — component tests, interaction tests, visual regression, accessibility
- **Infrastructure** — smoke tests, chaos experiments, load tests

## What to cover

Focus on: business-critical paths, error handling, edge cases, security boundaries, data integrity.

Skip: trivial accessors, framework code, one-off scripts.

## Output

Produce a test plan with: what to test, the test type for each area, coverage targets, and example
test cases. Identify the gaps in existing coverage.

---

# Guards that cannot fail

Whole families of defects share one shape, and it is not "bad tests". It is:

> **A claim of the form "X would be detected", where nobody ever made X happen.**

The shape shows up everywhere once you can see it. A lifecycle-event test that still passed with its
own mechanism deleted. A mutation battery reporting 15/15 killed because of a bad reporter flag.
Another reporting 20/20 because a shell-escaping bug meant the file was never mutated at all. Four
prescribed mutations that could not possibly redden, one of them with its mechanism backwards. A
regression guard written against one log channel when the warning arrives on another — green, with the
defect fully present.

Some of these originate in a **spec**, not in code. So the three clauses below bind anyone writing a
technical approach, an acceptance criterion, or a test plan — not only the person writing the test.

## The pattern, in code

Two directions, not one. A checker with a declared set has two ways to be wrong, and most teams guard
only the first:

- A declared item that the system does not satisfy is a **violation**. Everyone checks this.
- A declared item that **nothing registers** is *also* a violation. Almost nobody checks this — and it
  is the one that makes the guard vacuous. A guard that could pass because the thing it was meant to
  check does not exist at all proves nothing.

Where a checker has no declared set — a pure prefix walk, a directory scan, a computed parameter list
— there is no second direction available inside it, so its vacuity control lives in the **suite**
instead: a test that proves the walk finds something real before any empty-result assertion is worth
reading.

**Either layer is fine. Having neither is not** — and which layer a given guard's control lives in
should be stated, not left for the next reader to work out by grep.

The corresponding suite-level habit: assert the declared sets are **non-empty before** checking
anything against them, and say so in the module docstring. *A scanner nobody has watched fail proves
nothing.* Apply the same at the settings and fixture layers, so a pinned literal cannot silently
coincide with the default it exists to distinguish itself from.

None of this is a new idea; it is standard defensive testing. The gap is almost always that the idea
lives in a few files of code and was never lifted into how specs get written.

## Clause 1 — provenance, or an explicit "assumed, not verified". No third state.

A spec naming the observable a guard watches must either **cite where it was read** — file, package
version, line — or mark it **assumed, not verified**.

In the wrong-log-channel case, the damage was not the wrong channel. It was the **confidence**: the
spec was written in the imperative ("the mutation must redden it"), which reads as established fact,
so nobody re-checked it. A flagged guess costs one lookup. An unflagged guess costs a shipped guard
that detects nothing, and the cost lands years later.

Verify before prescribing, where you can. Where you cannot, say so in the spec.

## Clause 2 — every prescribed negative assertion carries a positive control

`expect(x).not.toHaveBeenCalled()`, `assert violations == []`, `assert not raised`, "this field is
absent" — every one of them passes for **two different reasons**: the defect is absent, or the
observable is unreachable. A spec must say which of those a green result proves, and prescribe the
control that tells them apart.

**The question is: can this assertion pass without the subject of the claim ever existing in the run?**

External-and-conditional observables are the leading cause — a library warning behind a build flag, a
walk over a table that must actually find entries, a subprocess whose exit code you are reading, a
parametrised case list computed from a data file outside the test. But an in-test fixture that never
contains the thing being excluded fails exactly the same way: "no non-GET operation is ever displayed
as includable" proves nothing when the fixture holds no non-GET operation at all.

Applied mechanically this becomes ceremony, and ceremony gets loosened — which is how a guard dies
quietly. Flagging four of ten assertions, with reasons, is worth more than flagging all ten.

Two controls that carry their weight:

- **Prove the walk found something.** Assert the declared set is non-empty before the subset check —
  and, for a newly added item, a control naming *that item* in the walked set, not merely that the
  checker returned empty.
- **Prove the observable fires.** Alongside "the warning was not emitted", a test that deliberately
  triggers the condition and asserts the warning **is** emitted, exactly once.

## Clause 3 — a prescribed mutation is a hypothesis until someone shows the red

Architects write specs before the code exists and **cannot demonstrate a red**. So the obligation
splits three ways:

- The **architect** writes mutations in the conditional — *"this should redden"*, never *"this
  reddens"* — and never states a mutation as though it had been run.
- The **acceptance criterion** carries the word **demonstrated**.
- The **dev** produces the demonstration and records it in the PR: the mutation applied, and the
  failure observed.

A mutation nobody has applied is a plan, not evidence. Say which one it is.

## Before signing off a spec that prescribes a guard

1. Does every named observable cite where it was read, or say it is assumed?
2. Is every negative assertion over an external or conditional observable paired with a control — and
   are the ones left unpaired left unpaired *for a stated reason*?
3. Is every mutation written in the conditional, with an acceptance criterion that makes someone
   demonstrate it?
4. Could this guard report green having executed nothing? Empty parametrise list, empty walk, absent
   directory, skipped file?

---

# A local dependency must match CI in credential shape, not just version

Tests gated on an environment variable skip silently without it, so exercising them locally means
provisioning the real dependency — a database, a broker, an object store. Matching CI's **version** is
the easy half, and the half everyone does.

The expensive failures come from provisioning choices that produce errors **indistinguishable from
product defects** at the point you hit them. Three recurring shapes:

- **A connection string missing a credential can silently select a different auth mode.** Code that
  picks its mode from the URL — password if one is present, federated identity otherwise — will take
  the second branch and fail with an infrastructure-sounding error about a missing identity or a
  failed token acquisition. That reads as a broken environment or a missing cloud grant. It means: put
  the credential in the string, matching CI's shape.
- **Provisioning with trust authentication breaks every test that asserts a rejection.** Under trust,
  the server accepts *any* string as a password — including the deliberately fake one a negative test
  feeds it. The rejection those tests exist to observe never happens, and you get red tests with
  nothing wrong in the code. Provision with the same real auth mechanism CI uses.
- **Shared global objects across logically separate databases.** Where roles or users are
  cluster-global while schemas are per-database, a second migrated database in the same cluster makes
  teardown fail — a drop blocked by dependent objects belonging to the *other* database. Dozens of
  tests go red, none of them a defect. One database per cluster, or one cluster per service.

The generalisation worth carrying: **a local dependency has to resemble CI in credential shape, not
only in version.** Record the provisioning recipe in the repo, because every person who hits this
loses the same day to it.
