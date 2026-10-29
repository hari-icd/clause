---
title: Screen labels
hint: Label every screen of a flow, in the designer's label style
---
INTENT: the designer wants every screen of a flow to carry a screen label, placed and styled to their spec, and the screens in a readable user-flow order. Sense what they mean from the context below; do not ask unless two readings are equally likely.

WHAT TO LABEL (first match wins):
1. Frames in the attached selection: label those, in the order of their x position.
2. A section in the selection (or the section the selected frames sit in): label its screens.
3. Nothing selected: the flow section the designer last worked in on this page (most recent frames you built or changed). If several sections qualify, label the one named in their text, else ask one short question.
Wireframes ("wf", "wireframe", low-opacity frames) are not screens: they stay unlabelled and sit above their design at 30% opacity. Cover groups are not screens.

SPEC (the designer's own "Screen label" group, never deviate):
- A frame named "Screen label": auto layout HORIZONTAL, hugs its text, padding 10/30/10/30, gap 10, corner radius 0.
- Fill: variable Colors/Background/bg-solid-secondary (bound, never a raw colour).
- One text inside: white, Spectral Regular 72, letter spacing -2%, line height 90 px, text = short screen title.
- Wrap each frame in a group and leave the group's name empty (Figma shows "Group").
- One label per screen, left edge aligned with the column's top-most item (the wireframe when there is one, else the screen), the label's bottom about 110 px above it, all labels on one baseline.
- If a label (or an old plain text title) already exists for that screen: reuse it, change its text, never stack a second.

TITLES: short, in the designer's words, from the frame name or its modal/page title ("New skill", "Settings"). Keep numbering only if the designer's existing labels in the file are numbered ("1.3 No results"); then continue their scheme. Too long a title makes the label overlap its neighbour: shorten it.

ORDER AND SPACING: if the screens are not yet in flow order, arrange them left to right in the user-flow order (list, create, edit, detail, settings...), one column per screen, 160 px gap, wireframe above its design with a 160 px gap. Position-only moves: never rename, delete or rebuild a frame the designer touched.

HOW: one use_figma call (figma-use skill), clone the designer's existing "Screen label" group in the file when there is one and change its text, otherwise build it to the spec above. Read the fill variable from an existing label when possible.

FINISH: screenshot the section at small scale and check no label overlaps another or is clipped. Reply with one line and a jump chip to the section: how many labels, and anything you could not place. Save any new correction to ds/design-rules.md.
