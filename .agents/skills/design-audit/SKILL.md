---
name: design-audit
description: Audits a page or view against platform design rules — spacing, hierarchy, touch targets, consistency — and reports concrete violations with fixes. Use when a UI looks "off" but you can't say why, or before calling any view done.
---

# Design Audit

Taste isn't a prompt — it's rules. Run the audit, fix what's off, re-run.

## The ruleset

**Brutal Rules (@alexanderpark)**
- **No gradients**: Zero `linear-gradient` or `bg-gradient-*`. Surfaces are flat, tonal, and defined by crisp 1px borders, not gradient fades.
- **Color scheme + ONE accent color**: Exactly one accent hue across the entire interface (e.g., `#0A4C40` petrol green). Zero competing accent hues. Semantic alerts (error/warning) use reserved, muted semantic tokens, not decorative accents. This rule catches "the color schema dissonates".
- **No emojis as icons**: Never use emojis (⏰, ❄️, ⚡, 📋, etc.) as UI icons. Use crisp monochrome SVG strokes or Material Symbols sized to the type scale.
- **No linear layouts**: Reject endless vertical ribbons of full-width identical cards. Break monotony with density shifts, metric callouts, and structured two-column telemetry.
- **No global margin/padding**: Spacing belongs to components and semantic groups, not lazy outer container wrappers.

**Spacing**
- Consistent 8pt grid. Padding inside cards is uniform per card type — no 13px here, 17px there.
- Related elements sit closer than unrelated ones (proximity = grouping). If two things look related but aren't, spacing is lying.
- Whitespace is a feature. Crowded screens are usually a hierarchy problem, not a content problem.

**Hierarchy**
- One primary action per view. If two buttons compete, one is wrong.
- Type scale: 3 sizes max per view (title / body / caption). No random 15px labels.
- The most important thing is biggest, boldest, or first — pick one signal, not three.

**Touch & mobile**
- Targets ≥ 44px. Spacing between adjacent tappables ≥ 8px (gloves-on rule for field use).
- No hover-only information. No tooltips as the only label.
- Safe-area padding on anything near screen edges.

**Consistency**
- Same action = same component everywhere (the app's `Button`/`IconButton`/`Modal` atoms — never a one-off styled button).
- Same data = same presentation (ticket cards look like ticket cards on every screen).
- Dark mode: audit in both. Contrast failures hide in the mode you didn't check.

## How to run it

1. Open the view (both color modes, 360px-wide viewport — the field phone).
2. Walk the ruleset top to bottom. List every violation as: **where → which rule → what's wrong → the fix.**
3. Fix, then re-run. Two clean runs = done.

## Anti-patterns this catches

- The "Inter everywhere, centered everything, same grey" default-AI look
- Cards with 4 different paddings
- Two primary buttons fighting
- Text that only fits because the desktop viewport is wide
- A view that's "done" in light mode and broken in dark
