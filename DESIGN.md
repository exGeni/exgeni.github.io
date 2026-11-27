---
# gstack: design-md-format=spec
name: ExGeni Contributions Portfolio
description: An evidence-led open-source portfolio with cool paper neutrals, blue and teal accents, and restrained serif headlines.
colors:
  primary: "#315F9F"
  surface: "#F5F7FA"
  surface-inset: "#EAF0F6"
  text: "#1B2633"
  text-muted: "#536170"
  accent: "#287B73"
  success: "#246C64"
  warning: "#8C6029"
typography:
  display:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontWeight: 500
    fontSize: "clamp(45px, 5.5vw, 72px)"
    letterSpacing: "-0.045em"
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: 16px
    lineHeight: 1.6
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: 12px
    letterSpacing: "0.035em"
  mono:
    fontFamily: monospace
rounded:
  sm: 1px
  md: 2px
  full: 50%
spacing:
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 65px
  2xl: 82px
---

# ExGeni Contributions Portfolio

## Overview

**Creative North Star:** Present upstream engineering work as a calm, evidence-led editorial record.
**Product context:** A one-page personal portfolio for readers assessing open-source contributions, adoption outcomes, and technical approach.
**Mode per surface:** Read — hero, activity, project areas, selected work, methodology, and attribution notes.
**Reference sites:** None; these decisions describe the current page.
**Key characteristics:**
- A Georgia headline establishes an editorial tone.
- Cool blue-gray surfaces keep the long page quiet and scannable.
- Blue marks project activity, links and reported work; teal marks landed work; amber marks work awaiting merge.
- Contribution claims sit beside issue, pull request, or landing references.

## Colors

**Strategy:** Restrained — a cool neutral base carries the long-form content, with blue for navigation and data, teal for adopted outcomes, and amber for reviewed work.
**Light or dark:** Light — the page is a public reading surface used alongside source links and technical records.
Keep primary links distinct from body text. Use status color together with explicit labels. Preserve contrast for every caption and data label; do not use the pale blue-gray border colors as text.

## Typography

Georgia is reserved for display headings and large figures. Inter is used for body copy, navigation, labels, and data descriptions. Monospace is limited to inline technical identifiers. The browser loaded the page without remote font requests; installed font-file provenance is unverified, so preserve the declared fallback stacks.

## Layout

The content column is capped at 1180px. The hero pairs a short introduction with a contribution summary; later sections alternate a full-width tinted band with a centered content column. The layout changes at 850px and 620px. Keep data readable in a single column on phones and avoid horizontal scrolling at 375px.

The spacing values above are observed anchors: 4px chart inset, 12px compact gaps, 24px panel insets, 40px mobile hero gap, and 65–82px section rhythm. Keep compact rows distinct from major section breaks.

## Elevation & Depth

Use thin blue-gray borders to separate data panels. The hero summary is the only elevated panel, with a low-opacity shadow and a blue top rule. Do not add glow or shadows to every section.

## Shapes

Keep panels square or nearly square. Use 1–2px radii for small marks and status labels; reserve the circular shape for the identity mark and status dot.

## Components

- **Header and links:** Blue hover color, visible keyboard focus, and 44px minimum targets on tablet and phone widths.
- **Contribution summary:** White surface, blue top rule, large serif totals, and readable muted labels.
- **Charts:** Blue for issues and teal for pull requests; include text labels and numeric values so color is not the only signal.
- **Contribution rows:** Keep the result and its upstream references together; use adopted and reviewed labels with their text.
- **Status labels:** Teal for landed work (authored or co-authored), blue for reported and fixed upstream, amber for approved and awaiting merge, with sufficient text contrast.

## Do's and Don'ts

- Do keep evidence links adjacent to the contribution claim they support.
- Do retain the contrast, 12px label floor, and tablet/phone link target sizes established in the page.
- Do use full-width tinted sections to mark changes in subject.
- Don't add decorative three-card feature grids, gradients, or glowing surfaces.
- Don't communicate adoption status through color alone.
- Don't shrink chart labels or source links to fit; allow wrapping instead.

## Motion

- **Approach:** Minimal-functional.
- **Easing:** Enter(ease-out), exit(ease-out), move(ease-in-out).
- **Duration:** Micro(50–100ms), short(150–250ms), medium(250–400ms), long(400–700ms).
- **The one authored moment:** Smooth in-page anchor scrolling; disable it when reduced motion is requested.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-19 | Initial design system recorded | Captured from the rendered portfolio after improving text contrast, type size, and mobile link targets. |
| 2026-11-27 | Blue status for reported work; projects and selected work before charts; three languages | A reader should see proof first and not mistake a report for authored code. |
| 2026-11-27 | Desktop type one step larger (body 18px, labels 15px); language switches in place | The owner found the desktop text hard to read, and switching jumped to the last anchor. |
