# Accessibility — internal checklist

Run over the generated code. Fix what it surfaces. Produce no report, no score, no summary.

This is a first-pass filter, not formal compliance, and it does not replace tooling or user testing. Say that only if asked.

## Finding contract

Evidence is `path:line` plus a snippet. **No evidence, no finding.** Fix in order: blocking, then serious, then moderate. Do not invent findings to feel thorough, and do not soften real ones.

## Blocking

| Check | WCAG | Look for |
|---|---|---|
| Images without alt | 1.1.1 | `<img>` with no `alt` |
| Icon-only buttons | 4.1.2 | `<button>` containing only an SVG, no `aria-label` |
| Inputs without labels | 1.3.1 | `<input>` / `<select>` / `<textarea>` with no associated `<label>` or `aria-label` |
| Non-semantic click handlers | 2.1.1 | `<div onClick>` / `<span onClick>` with no `role`, `tabIndex`, `onKeyDown` |
| Link with no destination | 2.1.1 | `<a>` with `onClick` and no `href` |

Icon-only buttons are the most frequent failure in a generated dashboard — toolbar actions, row actions, close buttons.

## Serious

| Check | WCAG | Look for |
|---|---|---|
| Focus outline removed | 2.4.7 | `outline-none` or `outline: none` with no visible replacement |
| Missing keyboard handlers | 2.1.1 | `onClick` with no `onKeyDown` on a non-button |
| Color-only information | 1.4.1 | Status conveyed by color alone, with no icon or text |
| Touch target too small | 2.5.5 | Interactive target under 44×44px |

Color-only status is a live risk in generated UI: pair any status color with an icon or text, don't rely on a tint alone.

## Moderate

| Check | WCAG | Look for |
|---|---|---|
| Heading hierarchy | 1.3.1 | Skipped levels, `h1` → `h3` |
| Positive tabIndex | 2.4.3 | `tabIndex` greater than 0 |
| Role missing required attributes | 4.1.2 | `role="button"` with no `tabIndex="0"` |

## Contrast and theme

If the project has a token layer, that's the source of truth for contrast-safe colors — don't reintroduce a raw gray or a one-off tint next to it.

- Muted or secondary text needs to clear 4.5:1 against its surface. If the project already darkened its muted-text tokens to hit AA, don't lighten them back or introduce a new ad hoc muted gray.
- If the project supports a dark theme, **anything tinted must be checked in both themes.** A status color that reads fine on light and washes out on dark is a finding.
- Contrast below 4.5:1 for body text is a finding, whichever theme it appears in.

## Component states

Generated screens tend to ship the happy path only. Check for:

- Button states: disabled, loading, hover, active, focus.
- Field states: error, disabled, and the error message actually associated with the field.
- Screen states: empty, loading, error, no-permission. Reach for the project's own empty/skeleton components if it has them, rather than inventing new ones.

## After the checklist

Fix what belongs to what you just built. Leave unrelated pre-existing issues alone. Report nothing.
