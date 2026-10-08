---
description: Start a cycle — read the board, agree the goal, run the fleet loop from Gate A
---

Start a cycle of spec-driven work. The goal, if given: the text the person gave after invoking this workflow, if any

Follow `AGENTS.md` §6 exactly. In short:

1. **Read the board** — `openspec list`, `openspec list --specs`, `openspec doctor` — and read
   `openspec/project.md`.
2. **If `openspec/project.md` is still the unfilled template, stop here.** Say so, and ask the human
   to settle the stack. Everything downstream of an undeclared stack is guesswork wearing a spec.
3. **Confirm the goal** for this cycle, in one sentence, with the human.
4. **Spawn `pm`** to build the change slate — names, tracks, order, owners, scope cut. Present
   **Gate A**.
5. On approval, **spawn `architect` and `qa-manager` in parallel**. Present **Gate B**.
6. On approval, run the per-change loop in dependency order: `dev` → `code-reviewer` → **Gate C** →
   `qa`.
7. When `qa` verifies every change, **spawn `devops`**. Present **Gate D**.
8. On approval: deploy, archive each shipped change, then spawn `pm` to close the cycle and capture a
   short retro. Report the demoable outcome and stop.

Throughout: quote real change names and links, give each subagent only the context its charter needs,
and never skip a gate. You route and verify — you do not write production code yourself.
