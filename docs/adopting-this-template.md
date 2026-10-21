# Adopting this template

How to take this workspace into a real project, and what to change once it is there.

## 1. Get the workspace

**A new project** — clone or copy this directory, remove `.git`, and start fresh:

```bash
git clone <this> my-project && cd my-project
rm -rf .git && git init
```

**An existing codebase** — copy the workspace files in, then wire OpenSpec up yourself rather than
running `openspec init`, which would regenerate what is already here:

```
AGENTS.md  CLAUDE.md  opencode.json  harness/  scripts/  openspec/  docs/adr/
.claude/   .opencode/   .agents/
```

Merge rather than overwrite if the repo already has a `CLAUDE.md`, an `AGENTS.md`, or a `.gitignore`.

Install the CLI once per machine:

```bash
npm install -g @fission-ai/openspec@latest    # needs Node 20.19+
openspec --version
```

## 2. Declare the stack

Fill in `openspec/project.md`. **This is not optional and it is not paperwork.** The harness stops
before prescribing anything technical while it is still the unfilled template, on purpose: a stack
chosen by accident, through whatever library the first agent reached for, is the most expensive default
there is.

Two sections are worth more care than the rest:

- **The one build command and the one test command.** If either takes more than one command, fix that
  before the first change. Every agent and every new person pays that tax otherwise, every time.
- **The credential shape tests expect locally** — not just the version of the database or broker. This
  is the single most common way a developer loses a day to an error that looks like a product defect.
  See the **testing-strategy** skill.

## 3. Seed the living specs (existing codebases only)

A codebase that already works has capabilities that no spec describes. You have two honest options:

- **Start empty.** `openspec/specs/` fills in as changes land and archive. Simple, and truthful about
  what has actually been reviewed — but for a while the specs describe only the recent edges of the
  system.
- **Backfill deliberately.** Write specs for the capabilities you are about to change, not for
  everything. A backfilled spec nobody verified against the code is a confident description of a system
  that may not exist, which is worse than no spec at all.

Either way, write specs for what the system **does**, not what you wish it did. The gap between those
is a backlog, and it belongs in `openspec/changes/`.

## 4. Adjust the harness to the team

Everything below is a deliberate default, not a law. Change it in `harness/`, then run
`node scripts/sync-harness.mjs`.

| If your team… | Change |
|---|---|
| Ships small and often, with high trust | Delegate Gate C to `code-reviewer` (`AGENTS.md` §4). Keep B. |
| Has no deploy pipeline yet | Drop `devops` and Gate D until there is one. Do not keep a gate nobody can satisfy — an unsatisfiable gate gets waved through, and then so do the others. |
| Uses a tracker (Jira, Linear, YouTrack, GitHub Issues) | Keep OpenSpec as the source of truth for **specs**; let the tracker hold scheduling. Add the mapping to `openspec/project.md` and the tracker's MCP server to `opencode.json` / `.mcp.json`. Do not duplicate acceptance criteria in both places — name which one wins. |
| Is one or two people | Merge `pm` into the orchestrator and `qa-manager` into `qa`. Keep `code-reviewer` separate even then: the independent judgment is the point, and it is the first role people are tempted to collapse. |
| Runs agents in git worktrees | Wire `guard-shared-checkout.mjs` into `.claude/settings.json` as a second `PreToolUse` hook. |
| Works in a language with strong conventions | Add the language-specific spelling of the **clean-code** rules to `openspec/project.md`, rather than forking the skill. |

## 5. What not to change

A few things carry more weight than they look like they do:

- **Gate B.** It is where a wrong spec is cheap to fix. Every other gate catches a problem that Gate B
  could have prevented, at a hundred times the cost.
- **`dev` never marks its own work done.** The moment that collapses, "done" starts meaning "the author
  believes it works", and QA becomes a formality.
- **Track 0 is not a loophole.** If you are arguing the case for it, it is Track 1.
- **`openspec/specs/` is generated.** Hand-editing it produces a spec no change proposed, no human
  approved, and no archive will reconcile. The hook is there because this one is quiet and expensive.
- **Traceability stays out of source comments.** Code must read cleanly to someone with no access to
  the specs, the PRs, or the tracker.

## 6. Verify the setup

```bash
openspec list                     # empty is fine; "root: null" is not
openspec doctor
node scripts/sync-harness.mjs     # should be a no-op on a clean checkout
opencode agent list               # should list the seven specialists
```

Using Antigravity instead? Register the directory first — `agy --new-project` (or open `agy`
interactively and accept its offer to register the folder) — a plain `agy` in a never-registered
directory silently falls back to another project's context and will not see `.agents/` at all. Once
registered, ask it directly: *"list every custom agent and every custom skill or workflow you can see
for this workspace"* should name all seven agents and every `harness/skills/` entry.

Then, in a session, run `/board`. If it reports the workspace is set up but the project has not been
declared yet, everything is wired correctly and the next step is `openspec/project.md`.
