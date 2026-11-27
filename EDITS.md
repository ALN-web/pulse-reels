# Manual edits log

Every hand fix to a generated file goes here. Fewer edits = higher Skills score.

| Date | Run (slug) | Step | File | What was changed | Why the pipeline got it wrong |
|------|------------|------|------|------------------|-------------------------------|
| 2026-11-26 | heart-5-minute-habit | render (review) | storyboard.json s5, scenes/s6.html | Headline "Lower risk" -> "Regular activity"; odometer digits made fixed-width | Agent fix after snapshot review: duplicated text, uneven digit widths |
| 2026-11-27 | what-your-blood-pressure-numbers-mean | render (review) | scenes/s2-s6.html | Moved SYSTOLIC/DIASTOLIC tags off the digits, widened cards, shortened badge text | Agent fix after snapshot review: overlaps and text wrapping |
| 2026-11-27 | what-your-blood-pressure-numbers-mean | caption (after final render) | scenes/s5.html | "checked by a professional" forced to two lines, smaller font; re-rendered | Wrap only visible in the final video frame, missed in snapshot review |
| 2026-11-27 | when-a-headache-means-see-a-doctor | script (after headless run) | script.json, storyboard.json s1, scenes/s1.html | Hook "Three headache red flags" -> "Five" (the script lists five); s1 now shows five flags; voice regenerated | Agent miscounted its own list in the hook; human review caught it |
