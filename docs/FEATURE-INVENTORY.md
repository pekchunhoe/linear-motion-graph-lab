# Source feature inventory

Audited before combining on 14 September 2026. Sources are the complete sibling projects `../linear-motion/linear-motion-graph-1-stvt-mobile` and `../linear-motion/linear-motion-graph-2-vtat-mobile`.

Both use semantic HTML, plain CSS and native ES modules. Their controller, styles, graph renderer, physics core, animation and activity modules are byte-identical. Only model coefficients, page content and model-specific physics tests differ.

| Feature | Displacement → velocity | Velocity → acceleration | Combined location |
|---|---|---|---|
| Two interactive canvases, shared time guides | Position / velocity | Velocity / acceleration | Adjacent graph cards |
| Analytic tangent; open derivative limits at corners | Yes | Yes | Main graphs and full state explanation |
| Play, Stop, Reset, speed, slider | Yes | Yes | One playback bar per tab |
| Timestamp animation, cancellable RAF | Yes | Yes | Shared Timeline class, independent instances |
| Pointer capture, mouse/touch/pen, cancel | Both graphs | Both graphs | Retained handlers scoped per panel |
| Arrows, Shift, Home/End, Space, R | Yes | Yes | Single active-panel keyboard dispatch |
| SVG car, road coordinates and direction | Yes | Yes | Compact strip above graphs |
| Time, position, velocity, acceleration, speed, distance, displacement, direction and motion state | Yes | Yes | Compact key values plus full live-state details |
| Prediction with text answer and hide/reveal | Velocity | Acceleration | Prediction accordion below graphs |
| Secant and average velocity | Yes | — | Average velocity accordion |
| Signed / absolute area and negative hatching | — | Yes | Area explorer accordion |
| Acceleration area and Δv | — | Yes | Area explorer |
| Optional derived quantity | Acceleration and impulses | Integrated position | Derived quantity accordion |
| Concepts, definitions, graph rules | Yes | Yes | Concepts accordion |
| Polynomial worked example and gated solutions | Three questions | — | Worked example accordion |
| ABCDE direction / changing speed | — | Four segments | ABCDE accordion |
| Challenges, validation, hints, gated solutions | Eight | Eight | Challenge accordion |
| Accessibility / reduced motion / zoom | Yes | Yes | Retained, plus accessible tabs and unique IDs |

Original equations and exact distance/integration functions are retained. New work adds in-page tabs, independent state and lifecycle coordination, compact layout, capped canvas DPI, and an average-acceleration secant using existing interval results.
