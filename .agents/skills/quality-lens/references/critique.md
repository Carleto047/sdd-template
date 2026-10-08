# Critique — internal checklist

A systematic pass over a generated screen. Work through it as a checklist, fix what it surfaces, and produce no document. Nothing here is written to the thread and nothing is shown to the person you're building for.

## Finding contract

Every finding needs evidence (`path:line`, snippet, or named region), a concrete observation, its impact on the user, and a direction with a reason. **No evidence, no finding.** Be critical; do not pad. If a lens turns up nothing, that is a valid outcome — move on silently.

Priority when several things compete: blocking > friction > quality > polish. Structural beats behavioral beats visual on a tie.

## Step 0 — Context

- What this screen is for, and who uses it.
- The emotional context of the task: routine, high-stakes, under time pressure, exploratory.

A screen someone opens repeatedly during their workday argues for density, scanability, and stability — not for a welcoming experience. It may be a dashboard, a chat surface over some data, an approval flow, or a document view; the last two carry consequence, and consequence raises the bar on Steps 3 and 6.

Never invent the product. If context is missing and it matters, it is an assumption to name in one sentence.

## Step 1 — First impressions

Read the screen as if you had not built it. What stands out, what fails, what the eye lands on first. See what is there, not what you intended.

## Step 2 — Visual design

| Dimension | Look for |
|---|---|
| **Color intentionality** | Does every color carry meaning, or is some decoration? Extra backgrounds, competing accents, broken hierarchy. |
| **Typographic hierarchy** | Clear scale; distinct roles for title, body, label. |
| **Surface and stroke quality** | Hairlines that structure vs. borders that add noise. Two competing shadows in one region. |
| **Visual weight vs. importance** | Is the heaviest thing on screen the most important thing? |
| **Spacing and alignment** | Consistent rhythm on a fixed scale. Excessive padding. Broken alignment. |
| **Icon consistency** | One family, one weight, one optical size. |

Every fix here resolves to a token or variable if the project has one — see the SKILL's note on visual authority.

## Step 3 — Interface design

| Dimension | Look for |
|---|---|
| **Focusing mechanism** | Where does the eye go first? Does everything compete equally? |
| **Progressive disclosure** | Graduated complexity, or forty things dumped at once? |
| **Information density** | Density appropriate to the surface. A dashboard is not an onboarding screen. |
| **Expectation setting** | Is it clear what this shows, over what period, and how current it is? |
| **Feedback** | Are actions acknowledged? Is loading visible without being noisy? |
| **Redundancy** | Labels and titles restating what is already established. |

The two most common failures in a generated dashboard: nothing is primary, and empty or loading states were never considered.

## Step 4 — Consistency and conventions

| Dimension | Look for |
|---|---|
| **Pattern consistency** | The same action expressed the same way everywhere. |
| **Component reuse** | Two things that should be one component and are not. |
| **Web conventions** | Deviations that are deliberate rather than accidental. |
| **Visual cohesion** | One hand, not a collage. Anything hand-rolled where an existing component would fit. |

A hand-rolled control where the project's own library already has one is a finding, not a shortcut.

## Step 5 — User context

- How does this screen make someone feel, and what in the UI causes that?
- What state is the person likely in when they open it?
- Does the screen respect that state or add load?
- Where is care missing at the edges: empty, error, loading, no permission, stale data?

Edge states are where generated screens are thinnest and where a real user hits reality first.

## Step 6 — Usability heuristics

The full ten, as internal criteria. **Do not scope this list to whichever archetype is currently shipping.** A generated screen can be a dashboard, a chat surface, an approval flow, or a document view, and the interaction-heavy heuristics are exactly the ones that matter most for the last two. Judging a screen against a shrunken rubric because today's archetype is simple is how coverage quietly degrades.

Apply each against its definition. A finding is valid only if it violates the definition.

| # | Heuristic | The question here |
|---|---|---|
| **H1** | Visibility of system status | Does the screen say what it shows, over what period, and how current the data is? Is a long action's progress visible? Silent staleness is the classic failure. |
| **H2** | Match with the real world | Does every label use the words the actual user uses, not internal or system vocabulary? |
| **H3** | User control and freedom | Can someone leave a state they entered by mistake? Is there a marked exit from a form, a filter, a multi-step flow, a submitted request? Critical in approval flows. |
| **H4** | Consistency and standards | Does the same action look and behave the same everywhere it appears? |
| **H5** | Error prevention | Is a destructive or irreversible action guarded before it happens, rather than explained after? Confirmation with a stated consequence beats a good error message. |
| **H6** | Recognition over recall | Does the person have to remember something from another screen to use this one? Are the current filters, scope, and selection visible? |
| **H7** | Flexibility and efficiency | Is there a faster path for someone who uses this every day, without it getting in a first-timer's way? |
| **H8** | Aesthetic and minimalist design | Is anything on screen that is rarely needed? Every extra unit of information dims the relevant ones. |
| **H9** | Error recovery | Is every failure stated in plain language, with the cause and a way forward? No codes, no dead ends. |
| **H10** | Help and documentation | Ideally the screen needs no explanation. Where it does, is the help where the confusion happens rather than in a separate place? |

Severity, as an internal ordering only — it decides what gets fixed, and it is never shown:

| Level | Means |
|---|---|
| **Critical** | Prevents completing the task, or causes a serious error |
| **Major** | Blocks or significantly hinders the task |
| **Minor** | Mild friction, low priority |
| **Cosmetic** | Does not affect the task |

Same contract as every other finding: evidence, observation, impact, direction. **Do not force findings** — a heuristic with no real violation has none, and that conclusion stays internal. No per-heuristic table, no score, no report, no document.

## Voice of the pass

Specific, decisive, fact before judgment, quantified where possible, direction with a reason.

Not: hedging, vagueness, prescribing with no why, praise padding, invented findings, or ending in a question instead of a judgment.

## After the checklist

Apply what is relevant to what you just built. Leave unrelated pre-existing issues alone. Report nothing.
