---
name: stack-conventions
description: >-
  The project's declared stack, service shape, and house style — read from openspec/project.md and
  enforced as a constraint, not re-debated. Use this skill before writing any technical approach,
  before implementing any ticket, and as the fit checklist when reviewing a PR. Trigger it whenever
  someone proposes a library, framework, runtime, datastore, protocol, or deployment target, and
  whenever a change would introduce a dependency, an outbound call, or a new service boundary.
---

# Stack conventions

Every project that adopts this workspace declares its stack **once**, in `openspec/project.md`, and
then stops arguing about it. This skill is how that declaration becomes binding.

**Read `openspec/project.md` before you prescribe, implement, or review anything technical.** If it
has not been filled in, that is the first thing to fix — say so and stop, rather than inventing a
stack by accident through the first library you reach for.

## The stack is not re-debated

A settled stack is worth more than an optimal one. Re-litigating it mid-change costs a gate, and the
second-order cost is worse: a codebase where each module reflects whoever wrote it.

- **Inside the declaration, act.** Anything `openspec/project.md` permits, you may use without asking.
- **Outside it, escalate — do not act.** A need to deviate is an **exception request** presented to
  the human with the cost of each option, not a decision you make on the way past. This applies to a
  new runtime, a new datastore, a new framework, a new protocol, a new deployment target, and to any
  dependency that ends up on a security or data path.
- **An approved deviation is recorded as an ADR** in `docs/adr/`, and `openspec/project.md` is updated
  in the same change. An approval that lives only in a chat transcript will be re-litigated within the
  month.

## What the declaration has to cover

If `openspec/project.md` is missing any of these, the project has an unsettled question that will
surface as an argument during implementation. Flag it early.

| | The question it settles |
|---|---|
| **Runtime and language** | Versions, pinned how, and the one command to build |
| **Frameworks** | Web, data access, background work — and which layer each owns |
| **Datastores** | What stores what, and the migration tool |
| **Identity and authorization** | How a request proves who it is, and where that check happens |
| **Secrets** | Where they live and how a process gets one — ideally, never as a static value |
| **Boundaries** | Which services exist, what each owns, and how they talk |
| **Deployment target** | What runs where, and how a release reaches it |
| **Observability** | Log shape, metrics, and the id that stitches a request end to end |
| **Test commands** | The one command to run tests, and the coverage bar |

## Service shape

Whatever the framework, the same shape holds, and a reviewer should be able to find their way around
any service in this project within a minute:

- **Transport is thin.** Route handlers parse, validate, delegate, and serialize. Business logic lives
  below them, in code that can be tested with no transport at all. A handler with branching logic in
  it is the single most common source of untested behavior.
- **Configuration is loaded once, at the edge, into a typed object.** Not read from the environment in
  the middle of a function, where it cannot be tested and cannot be audited.
- **Dependencies are injected, not imported and instantiated in place.** A module that constructs its
  own database connection cannot be tested and cannot be reused.
- **Errors cross the boundary deliberately.** Internal failures map to a documented external shape.
  Stack traces, driver messages, and internal identifiers never reach a client.
- **Every request carries a correlation id** end to end, propagated to every outbound call and present
  on every log line.

## Egress and dependency discipline

**Introduce no undeclared operations or dependencies.** Two things are meant literally:

- **A new outbound call is a design decision**, not an implementation detail — a new host, a new
  third-party API, a new queue. It belongs in `design.md` and, if it crosses a trust boundary, in the
  spec delta. A call added quietly during implementation is a hole nobody reviewed.
- **A new dependency earns its place.** Prefer the standard library, then something already in the
  manifest, then something new. A transitive dependency added to save ten lines is a supply-chain
  surface added to save ten lines.

## Identity and data paths get the highest rigor

Wherever a request's identity is established, exchanged, or trusted; wherever data crosses a trust
boundary; wherever a secret is read — that code is reviewed harder than anything else, and the bar is
not a matter of taste:

- Act **as the user** where the design says so, never as a service credential standing in for one.
- **Strip and re-inject** identity-bearing headers at every boundary. Never forward a header you did
  not validate.
- Treat every payload from outside the boundary as **untrusted**, including one from another service
  you own.
- **Audit the access, not the intent** — emit the event where the data is actually read, carrying the
  real identity and the correlation id.
- **No static secrets.** Prefer federated or managed identity; where a secret is unavoidable it lives
  in the declared secret store and is never written to a log, an error, a test fixture, or a manifest.

## Comments and docstrings

Comments explain **why**, never what. A module docstring says what the module does and any invariant a
caller must respect. An inline comment is one or two lines. Needing more usually means the code, or
the function boundary, is the wrong shape — fix that instead of narrating it.

No change names, no gate references, no attribution, no change history. `git log` already answers those
questions, and accurately. State the rule, never the incident that produced it: write "header values
are percent-encoded; consumers must unquote", never the bug story.

See the **clean-code** skill for the full catalog.

## Testing expectations

Unit tests cover the new and changed lines with meaningful assertions — not coverage theater. Tests
run with the one declared command. A test that needs a live external dependency is an integration test
and is labelled as one, so the unit suite stays fast enough that people actually run it.

See the **testing-strategy** skill, particularly *Guards that cannot fail*.

## Self-check before opening a PR

1. Does every technical choice sit inside `openspec/project.md`, or is there an escalated, recorded
   exception?
2. Did this change add a dependency or an outbound call that the design did not name?
3. Is transport thin, config typed and loaded once, and every dependency injected?
4. Does every request path propagate the correlation id?
5. Is there a secret, an internal identifier, or a stack trace anywhere it could reach a client or a
   log?
6. Do the comments explain why, and do they contain no change references or history?
7. Does the declared build command build, the declared test command pass, and the linter come back
   clean?
