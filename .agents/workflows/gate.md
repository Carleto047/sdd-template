---
description: Present a human gate — what was done, the evidence, what is next, the risks
---

Present gate **the text the person gave after invoking this workflow, if any** to the human, then stop.

Before presenting, satisfy the gate's own preconditions. Do not present a gate whose station has not
met its verification contract — that wastes the scarcest thing in the loop, which is a person's
attention.

- **Gate A** — `pm` produced a slate where every change has a real name, an owner role, a track with a
  stated reason, acceptance criteria or their source, and an out-of-scope line; the cycle has a goal
  and a demoable outcome per lane.
- **Gate B** — every artifact the track requires exists, `openspec validate` passes, and the test plan
  maps every acceptance criterion to at least one test.
- **Gate C** — a written review exists, every material issue is a concrete comment with a suggested
  fix, and the reviewer ran the build and tests themselves.
- **Gate D** — the pipeline is green, an unsigned artifact was watched failing to deploy, the SBOM is
  attached, the release lists its changes, and rollback was verified against the declared bar.

Then present exactly four things, and nothing else:

1. **What was done** — one paragraph. No preamble, no restating the request.
2. **The evidence** — change names, artifact paths, the `openspec validate` result, PR links, pipeline
   run links. Real identifiers only; never one you cannot produce on demand.
3. **What happens next** if approved — the specific next station and command.
4. **Risks, open questions, and escalations** — or the single word "None".

Then **wait**. Do not continue in the same response, do not offer to proceed, and do not answer the
gate yourself. A gate you answered yourself is not a gate.
