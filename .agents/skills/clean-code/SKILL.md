---
name: clean-code
description: Use when writing, fixing, editing, reviewing, or refactoring code in any language. Enforces Robert Martin's complete Clean Code catalog — naming, functions, comments, DRY, and boundary conditions — plus this workspace's comment-hygiene rules.
---

# Clean code: complete reference

Robert C. Martin's Clean Code catalog (Chapter 17), stated language-neutrally. Where a rule has a
language-specific spelling, `openspec/project.md` declares which one applies here — read it rather than
assuming the conventions of whatever language you used last.

## Comments (C1-C5)

- **C1**: No metadata in comments — that is what version control is for
- **C2**: Delete obsolete comments immediately
- **C3**: No redundant comments
- **C4**: If you must write one, write it well
- **C5**: Never commit commented-out code

### Comments are short, and about the code

A comment earns its place by explaining **why** the code is the way it is — a constraint, a non-obvious
tradeoff, a subtle failure mode. Anything else is noise, and noise rots.

- **Budget.** Module docstring: a few lines saying what the module does and any invariant a caller must
  respect. Inline comment: one or two lines. Needing more usually means the code — or the function
  boundary — is the wrong shape. Fix that instead of narrating it.
- **No change, gate, or story references.** Do not write a change name, a gate ruling, a sprint, or a
  ticket number in code. That history belongs in the commit, the PR, and `openspec/`, which are built
  to hold it. Code must be readable by someone with access to none of them.
- **No change history or attribution.** Never write what a line "used to be", which change fixed it,
  who decided it, or what was removed. `git log` and `git blame` already answer that, and accurately.
  Describe the code as it is now.
- **ADRs are the one allowed citation**, used sparingly: name an ADR only where the code directly
  encodes that decision (`// Unbuffered per ADR-23.`). ADRs are durable design records; changes and
  tickets are not.
- **State the rule, not the incident.** Write the invariant ("header values are percent-encoded;
  consumers must unquote"), never the bug story that produced it.

Rewrite comments like these when you touch the file. Leaving them is choosing to keep the rot.

## Environment (E1-E2)

- **E1**: One command to build
- **E2**: One command to test

Both are named in `openspec/project.md`. If either takes more than one command, that is a defect in the
project, not a fact about it.

## Functions (F1-F4)

- **F1**: At most three arguments — group the rest into a structured type
- **F2**: No output arguments — return a value
- **F3**: No flag arguments — split the function
- **F4**: Delete dead functions

## General (G1-G36)

- **G1**: One language per file
- **G2**: Implement expected behavior
- **G3**: Handle boundary conditions
- **G4**: Don't override safeties
- **G5**: DRY — no duplication
- **G6**: Consistent abstraction levels
- **G7**: Base classes don't know their children
- **G8**: Minimize the public interface
- **G9**: Delete dead code
- **G10**: Declare variables near their usage
- **G11**: Be consistent
- **G12**: Remove clutter
- **G13**: No artificial coupling
- **G14**: No feature envy
- **G15**: No selector arguments
- **G16**: No obscured intent
- **G17**: Put code where a reader expects it
- **G18**: Prefer instance methods to static ones
- **G19**: Use explanatory variables
- **G20**: Function names say what they do
- **G21**: Understand the algorithm
- **G22**: Make dependencies physical
- **G23**: Prefer polymorphism to if/else chains
- **G24**: Follow the language's conventions
- **G25**: Named constants, not magic numbers
- **G26**: Be precise
- **G27**: Structure over convention
- **G28**: Encapsulate conditionals
- **G29**: Avoid negative conditionals
- **G30**: Functions do one thing
- **G31**: Make temporal coupling explicit
- **G32**: Don't be arbitrary
- **G33**: Encapsulate boundary conditions
- **G34**: One abstraction level per function
- **G35**: Keep configuration at high levels
- **G36**: Law of Demeter — no train wrecks

## Language-specific (L1-L3)

Martin's J1-J3 were Java-shaped. The principles generalize:

- **L1**: No wildcard or star imports — import what you use, explicitly
- **L2**: Use enumerated types, not bare magic constants
- **L3**: Type the public interface — static types where the language has them, annotations or schemas
  where it does not

## Names (N1-N7)

- **N1**: Choose descriptive names
- **N2**: Name at the right abstraction level
- **N3**: Use standard nomenclature
- **N4**: Unambiguous names
- **N5**: Name length matches scope
- **N6**: No encodings — no type prefixes, no scope prefixes
- **N7**: Names describe side effects

## Tests (T1-T9)

- **T1**: Test everything that could break
- **T2**: Use coverage tools
- **T3**: Don't skip trivial tests
- **T4**: An ignored test is a question about ambiguity
- **T5**: Test boundary conditions
- **T6**: Test exhaustively near bugs
- **T7**: Look for patterns in failures
- **T8**: Check coverage when debugging
- **T9**: Tests must be fast

## Quick reference

| Category | Rule | One-liner |
|---|---|---|
| **Comments** | C1 | No metadata — use version control |
| | C3 | No redundant comments |
| | C5 | No commented-out code |
| **Functions** | F1 | At most three arguments |
| | F3 | No flag arguments |
| | F4 | Delete dead functions |
| **General** | G5 | DRY — no duplication |
| | G9 | Delete dead code |
| | G16 | No obscured intent |
| | G23 | Polymorphism over if/else |
| | G25 | Named constants, not magic numbers |
| | G30 | Functions do one thing |
| | G36 | Law of Demeter — one dot |
| **Names** | N1 | Descriptive names |
| | N5 | Name length matches scope |
| **Tests** | T5 | Test boundary conditions |
| | T9 | Tests must be fast |

## Anti-patterns

| Don't | Do |
|---|---|
| Comment every line | Delete the obvious comments |
| A helper for a one-liner | Inline it |
| Wildcard imports | Explicit imports |
| Magic number `86400` | `SECONDS_PER_DAY = 86400` |
| `process(data, true)` | `processVerbose(data)` |
| Deep nesting | Guard clauses, early returns |
| `obj.a.b.c.value` | `obj.getValue()` |
| A 100-line function | Split by responsibility |

## How to report

When reviewing, identify violations **by rule number** — "G5 violation: duplicated logic in the two
handlers". When fixing, say what was fixed — "extracted magic number to `SECONDS_PER_DAY` (G25)".

The numbers are not pedantry. They make a review argument about a shared rule rather than about taste,
which is the difference between a reviewer being listened to and a reviewer being resented.
