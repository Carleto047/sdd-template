---
name: supply-chain-pipeline
description: >-
  How to build and extend the central deploy pipeline — signed, gated, and reversible. Use this skill
  whenever working on CI/CD, a pipeline template, artifact signing, supply-chain gates (secrets scan,
  SBOM, provenance), the rule that unsigned artifacts must fail to deploy, infrastructure-as-code for
  a release, or the fast no-rebuild rollback. Trigger it any time someone asks to "add a pipeline",
  "ship the version", "sign the artifact", "set up CI", or touches release or rollback — even if they
  do not mention signing.
---

# Supply-chain pipeline

The pipeline is where *evidence by construction* becomes real: nothing reaches an environment unless it
was built from known code, scanned, its bill of materials captured, and cryptographically signed. Build
it once, centrally, and make the gates impossible to skip.

The specific tools are whatever `openspec/project.md` declares. The shape below is not negotiable; the
vendors are.

## The one rule that shapes everything

There is **one central pipeline template**, and services reference it. They never copy their own.

A copied pipeline is a pipeline that drifts, and a drifted gate is a hole in the supply chain that
nobody will notice until it matters. If you are tempted to add a bespoke pipeline for one service,
that is a signal the template is missing a parameter — extend the template instead.

## Pipeline shape

```
build ─► gates ─► sign ─► deploy ─► (rollback ready)
```

1. **Build** the artifact reproducibly. Tag it with the commit SHA and the change names it ships.

2. **Gates — all blocking.**
   - **Secrets scan.** Fail on any detected secret. If the project uses managed identity, a secret in
     the artifact means something is already wrong upstream, and shipping it makes it permanent.
   - **SBOM generation.** Produce a bill of materials and **attach it to the artifact**. A release with
     no SBOM cannot be audited after the fact, which is exactly when you will need it.
   - **Provenance — signature versus code.** Verify the built artifact corresponds to the reviewed,
     merged commit, so an out-of-band or tampered build cannot slip through.

3. **Sign** the artifact and store the signature alongside it in the registry.

4. **Deploy — and the deploy step verifies the signature and rejects anything unsigned or
   unverifiable.** This is the requirement the rest of the chain exists to serve. Prove it, do not
   assert it: a deliberately unsigned artifact must be *observed* failing to deploy, and that
   observation is part of the acceptance evidence. A rejection nobody has watched happen is a claim,
   not a gate. (See **testing-strategy**, *Guards that cannot fail* — this is exactly that failure
   shape, at the infrastructure layer.)

5. **Rollback ready.** The previous signed release stays warm, so rolling back is a traffic or revision
   switch — fast, and with no rebuild. **Never design a release whose only way back is a rebuild.** A
   rollback that takes a build is a rollback nobody will reach for during an incident, which means it
   is not a rollback.

## Infrastructure and observability

- **Infrastructure is code**, reviewed and applied through the same pipeline as everything else. Never
  through a console. A console change is a change with no diff, no review, and no rollback.
- **Every pipeline credential is federated or managed identity.** No static secrets in variables, YAML,
  or the artifact.
- The deployed release emits the project's correlation id end to end. A release you cannot trace is a
  release you cannot debug.

## Release traceability

Every release **lists the change names it ships**, tying back to the build tags. That is how a deploy
answers "what changed, and who reviewed it" without archaeology. After a release, each shipped change
is archived (`openspec archive`), so `openspec/specs/` describes what is actually running.

## Acceptance evidence (the DevOps verification contract)

Before a deploy reaches a human gate, gather all five:

1. A **green pipeline run**, linked.
2. **Gate evidence**, including the **unsigned artifact actually failing a deploy**.
3. The **SBOM**, attached to the artifact, with its location named.
4. The **release with its change list**.
5. **Rollback verified** — a timed switch back to the prior release, within the declared bar, no
   rebuild.

Missing any one of them means the release is not ready. Send it back; do not wave it through, and do
not offer to gather the evidence after the deploy.

## When extending the template

- Add capability through **parameters and stages in the central template**, guarded so existing
  services keep working.
- Keep gates **blocking by default**. A gate that can be bypassed with a flag is decoration, and the
  flag will be set.
- If a genuine need conflicts with a gate — a build that genuinely cannot produce an SBOM, say —
  **escalate as an explicit exception** with the cost of each option. Do not quietly relax the gate,
  and do not add the bypass flag "temporarily".
