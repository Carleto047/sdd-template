---
description: Show the state of the SDD board — changes in flight, living specs, drift, and the working tree
---

Report the current state of this workspace, concisely, in this order. Run the commands; do not
describe them.

**Changes in flight**
run `openspec list` yourself and read its output before continuing

**Living capability specs**
run `openspec list --specs` yourself and read its output before continuing

**Relationship health (drift, unarchived changes)**
run `openspec doctor` yourself and read its output before continuing

**Working tree**
run `git status --short --branch` yourself and read its output before continuing

Then give a short read of the board, not a restatement of the output:

1. What is in flight, and what each change is waiting on — a gate, a review, QA, a deploy.
2. **Anything applied but not archived.** This is the failure that matters: it means
   `openspec/specs/` is describing a system that no longer exists.
3. Any capability with two open deltas against it — they will collide at archive.
4. What you would do next, and why. One recommendation, not a menu.

If the board is empty and `openspec/project.md` is still the unfilled template, say so plainly: the
workspace is set up but the project has not been declared yet, and that comes first.
