# SDD — a spec-driven development workspace

A reusable starter for building software with an agent fleet on a leash: **specs before code, small
verifiable increments, a check at every seam, and a human at every gate.**

It combines three things:

- **[OpenSpec](https://openspec.dev)** as the planning surface — capability specs, change proposals,
  deltas, and an archive step that folds applied changes back into the living spec.
- **A seven-agent fleet** — `pm`, `architect`, `dev`, `code-reviewer`, `qa-manager`, `qa`, `devops` —
  each with a charter and a verification contract it must satisfy before work advances.
- **Right-sizing**, so the process fits the change. The most common way spec-driven development fails
  is a one-line fix arriving with four user stories and sixteen acceptance criteria; three tracks exist
  precisely to prevent that.

Works with **opencode**, **Claude Code**, and **Antigravity** (`agy`) from the same source. Anything
else that reads `AGENTS.md` gets the harness too.

---

## Quickstart

```bash
git clone <this> my-project && cd my-project
npm install -g @fission-ai/openspec@latest    # needs Node 20.19+

# 1. Declare the stack. Nothing technical happens before this.
$EDITOR openspec/project.md

# 2. Start working.
opencode                                      # or: claude, or: agy
```

**First time opening this folder in `agy`:** Antigravity ties a workspace to a registered project,
and only a registered project's `.agents/` is read. If a fresh directory does not show the fleet or
skills below, run `agy --new-project` once — after that, plain `agy` in the same folder sees it.

Then, in the session:

```
/kickoff   build a service that ingests webhooks and exposes a search API
```

Four commands drive the loop:

| Command | Does |
|---|---|
| `/board` | Shows what is in flight, what has drifted, what is unarchived |
| `/track <request>` | Right-sizes a request into Direct / Light / Full before any work starts |
| `/kickoff [goal]` | Starts a cycle and runs the fleet loop from Gate A |
| `/gate <A\|B\|C\|D>` | Presents a gate to you in the four-part format, then stops |

And the OpenSpec workflows underneath them:

| Command | Does |
|---|---|
| `/opsx-propose "<name>"` | Creates a change and all its artifacts — planning only, never code |
| `/opsx-apply` | Implements the approved change |
| `/opsx-archive` | Folds the delta into `openspec/specs/` |
| `/opsx-explore`, `/opsx-update`, `/opsx-sync` | Investigate, revise, reconcile |

In Claude Code the `opsx` commands are namespaced: `/opsx:propose`. In Antigravity, `/board`,
`/track`, `/gate`, and `/kickoff` live as workflows rather than commands — same names, same behavior.

---

## How the loop runs

```
 intent ─► TRACK ─► /opsx-propose ─► GATE B ─► /opsx-apply ─► review ─► GATE C
              │       (+ test plan)              (dev)                    │
           GATE A                                                       merge
        (Track 2 only)                                                    │
                                                                         qa
                                                                          │
                                        GATE D ─► deploy ─► /opsx-archive
                                      (Track 2 only)              │
                                                         specs/ updated
```

### The three tracks

| | **Direct** | **Light** | **Full** |
|---|---|---|---|
| **For** | Trivially reversible, no observable change | One capability, no new interface | New capability, cross-cutting, security or data path, migration |
| **Artifacts** | None | proposal + spec delta + tasks | + design |
| **Gates** | None | B, C | A, B, C, D |

Escalating a track is any agent's call. Lowering one is yours alone, at a gate — it removes a check.
Security, data loss, money, and identity are never below Full, whatever the diff size.

### The four gates

- **A — Intent and track.** Scope, goal, tracks, what is out of scope.
- **B — Spec, design, and test plan.** *The highest-leverage gate.* A wrong spec approved here costs a
  hundred times what it costs to fix now.
- **C — Merge.** After the reviewer approves.
- **D — Deploy.** After a green, gated pipeline.

Every gate gets the same four things: what was done, the evidence, what happens next, and the risks.
Then the fleet stops and waits.

---

## Spec-anchored, deliberately

There are three levels of spec-driven development, and confusing them is where most arguments start:

1. **Spec-first** — specs written before code, then discarded.
2. **Spec-anchored** — specs written before code and **kept**, evolving with the capability. ← *here*
3. **Spec-as-source** — specs are the editable artifact; code is generated and marked do-not-edit.

This workspace sits at level 2. `openspec/specs/` holds the living truth, `openspec/changes/<name>/`
holds a proposed delta, and `openspec archive` folds an applied delta back in. **Code stays a
first-class, human-reviewed artifact** — nobody reviews a spec instead of reviewing the diff.

Level 3 is out of scope on purpose: generating code from prose combines the rigidity of model-driven
development with the non-determinism of a language model, and inherits the downsides of both.

---

## Layout

```
AGENTS.md                  The harness. Read by opencode, Antigravity, and anything AGENTS.md-aware.
CLAUDE.md                  Imports AGENTS.md, so Claude Code reads the same contract.
opencode.json              opencode project config — instructions and tool permissions.

openspec/
  project.md               ← THE STACK DECLARATION. Fill this in first.
  config.yaml              Artifact rules the propose workflow enforces.
  specs/                   Living capability specs. Generated by archive; never hand-edited.
  changes/                 Changes in flight, and changes/archive/ once shipped.

harness/                   ← THE ONLY PLACE YOU EDIT agents, skills, and commands.
  agents/                  Seven charters, tool-neutral.
  skills/                  Seventeen skills, from spec conventions to incident response.
  commands/                board, track, gate, kickoff.

scripts/sync-harness.mjs   Distributes harness/ to .claude/, .opencode/, and .agents/.
docs/adr/                  Architecture decision records, with the process and template.

.claude/ .opencode/        GENERATED. Committed so a fresh clone works with no build step.
.agents/                   GENERATED too — Antigravity's own directory convention.
```

### Editing the harness

```bash
$EDITOR harness/agents/dev.md
node scripts/sync-harness.mjs
```

`harness/` is canonical. The copies under `.claude/`, `.opencode/`, and `.agents/` are generated —
edit those and the next sync overwrites them. Agent charters carry tool-neutral frontmatter, which the
script transforms per tool: Claude Code gets `tools:` and a `model:` resolved from `model-tier`,
opencode gets `mode:` and a `permission:` map, and Antigravity gets `subagent`/`mainAgent` flags plus a
`tools:` list and `commandExecutionPolicy` **derived from the same `opencode-permission` edit/bash
flags** (`bash: allow` → `run_command`; `edit: allow` → `replace_file_content` + `write_to_file`) —
there is no fourth field to maintain by hand.

The `opsx-*` commands and `openspec-*` skills come from `openspec init` and are **not** owned by the
sync script. Refresh them with `openspec update` (run once per tool you added: `openspec init --tools
<tool>` the first time, `openspec update` after).

### Choosing models in opencode

The charters carry a `model-tier` — `high` for `architect`, `dev`, and `code-reviewer`, `standard` for
the rest. opencode resolves models from `opencode.json` rather than from the charter, so that a
workspace pointed at a different provider is not overridden. To pin them:

```json
{
  "agent": {
    "architect": { "model": "anthropic/claude-opus-4-20250514" },
    "qa": { "model": "anthropic/claude-sonnet-4-20250514" }
  }
}
```

### Using Antigravity (`agy`)

Antigravity ties a workspace to a **registered project** — only a registered project's `.agents/` is
read. A brand-new directory needs one of:

```bash
agy --new-project          # first time in this folder, non-interactive
agy                        # or just open it interactively; it will offer to register
```

After that, plain `agy` in the same folder sees the fleet and skills. This is a real, confirmed
requirement — a plain `agy` in an unregistered directory silently falls back to whatever project was
last active and will not show any of this workspace's agents, skills, or workflows, with no error.

Two format differences from Claude Code and opencode, both handled by the sync script automatically:

- **Agents are subagents, never primary.** Every charter syncs with `subagent: true, mainAgent: false`
  — the fleet is invoked by the top-level Antigravity session via `invoke_subagent`, the same role the
  orchestrator plays for Claude Code and opencode. None of the seven appears in Antigravity's own
  `/agents` switcher, by design.
- **Commands are workflows.** Antigravity has no separate slash-command mechanism and does not expand
  `$ARGUMENTS` or inline `` !`cmd` `` the way Claude Code and opencode do (confirmed against a live
  install) — `board`/`track`/`gate`/`kickoff` are generated into `.agents/workflows/` instead, with
  both rewritten as plain instructions for the agent to act on with its own tools. This matches how
  OpenSpec's own `opsx-*` output behaves for this tool.

---

## The skills

Loaded on demand by whichever agent's charter names them.

| Skill | For |
|---|---|
| `sdd-workflow` | The tracks, the gates, and how OpenSpec maps onto them |
| `spec-conventions` | Change naming, delta discipline, acceptance criteria, traceability |
| `stack-conventions` | Enforcing what `openspec/project.md` declares |
| `supply-chain-pipeline` | build → gate → sign → deploy, SBOM, no-rebuild rollback |
| `clean-code` | The full Clean Code catalog, language-neutral |
| `testing-strategy` | Test levels, and *guards that cannot fail* |
| `code-review` | Security, performance, correctness review method |
| `architecture`, `system-design` | ADRs, trade-offs, boundaries, API and data modeling |
| `debug`, `documentation` | Structured diagnosis; READMEs, runbooks, API docs |
| `deploy-checklist`, `incident-response` | Pre-deploy verification; rollback and postmortems |
| `quality-lens`, `frontend-ui-ux`, `apple-design` | UI critique, craft, and platform conventions |
| `unslop` | Removing the tells from generated prose |

---

## Safety rails

- **`openspec/specs/` is write-protected** by a PreToolUse hook. Deltas go in
  `openspec/changes/<name>/specs/`; the archive folds them in. Set `OPENSPEC_ALLOW_SPEC_EDIT=1` to
  correct genuine drift, deliberately.
- **`.claude/hooks/guard-shared-checkout.mjs`** is shipped but **not wired in**. Turn it on once agents
  run in per-agent git worktrees; with a single shared checkout it denies every write.
- **Destructive git is denied** by default: `git push --force`, `git reset --hard`.

Both hooks are Node, not `bash` + `jq`. Node is already required here (the OpenSpec CLI needs it) while
`jq` is absent on plenty of machines — and a fail-closed guard whose only dependency is missing denies
every write in the repo, which reads as a broken workspace rather than as protection.

Only Claude Code's PreToolUse hooks are wired up. Antigravity's `commandExecutionPolicy` (`auto` for
every agent granted `run_command`) and its own sandbox are the equivalent guard rail there; opencode's
equivalent is the `permission` map in each generated agent file plus `opencode.json`.

---

## Background

- OpenSpec — <https://openspec.dev/docs/installation>
- Birgitta Böckeler, *Exploring Gen AI: Spec-driven development — tools* —
  <https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html>

The right-sizing tracks, the deliberate choice of spec-anchored over spec-as-source, and the pressure to
keep artifacts lean all come from the second. Its central criticisms — process disproportionate to the
change, a review burden nobody can sustain, and the false sense of control that elaborate checklists
create — are the failure modes this workspace is shaped to avoid.
