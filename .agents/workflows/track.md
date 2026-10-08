---
description: Right-size a request into a track (Direct / Light / Full) before any work starts
---

Decide how much process this work earns, before touching anything.

**The request:** the text the person gave after invoking this workflow, if any

Load the **sdd-workflow** skill for the track definitions, then:

1. **Restate the request in one sentence.** If you cannot, the request is not yet clear enough to
   size — ask one question instead of guessing.
2. **Check the board first.** Run `openspec list` and `openspec list --specs`. Work that touches an
   existing capability is sized differently from work that creates one, and a change already in
   flight against the same capability changes the answer entirely.
3. **Name the track, and why, in one line.**
   - **Direct** — trivially reversible, no observable behavior change. No artifacts, no gates.
   - **Light** — one capability, no new interface, local and obvious. Proposal + spec delta + tasks.
     Gates B and C.
   - **Full** — new capability, cross-cutting, security or data path, migration, or hard to reverse.
     All four artifacts, all four gates.
4. **Apply the three rules.** Escalating a track is anyone's call; lowering one is the human's alone.
   Track 0 is not a loophole — if you are arguing the case, it is Track 1. Security, data loss, money,
   and identity are never below Track 2, whatever the diff size.
5. **Say what happens next** — the exact command, and who runs it.

If the track is genuinely borderline, say which two it sits between, give your recommendation, and
ask. Do not default upward to be safe: Track 2 ceremony on Track 1 work teaches everyone to skim, and
then Gate B gets skimmed too.
