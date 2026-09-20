# Custom Motion Graph Builder

The two existing tabs retain all 9 STVT and 8 VTAT presets. Each tab has a Preset graphs / Custom graph selector, its own custom draft and bounded undo/redo history. Selecting a source resets the timeline; editing the current draft preserves the time and clamps it when duration shrinks. Preset selection and custom graph definitions remain independent.

## Editing

- Drag A–L on the primary graph with mouse, touch or pen. Nodes have 44 CSS-pixel hit targets. Empty primary graph space retains normal page scrolling; use the timeline or derived graph to seek.
- Focus a node and use arrows to change its time/value. Shift multiplies the step by five. Point keys take priority over simulation shortcuts.
- Expand Edit points for labelled numeric controls. The first time is fixed at zero. The last point sets duration. Numeric input bypasses snapping and validates before compiling.
- Snap is on by default and follows minor axis ticks, four subdivisions per labelled interval. Turning it off gives finer dragging and 0.1-unit keyboard steps.
- Add inserts halfway through the selected point's following segment (the preceding segment at the final node). Delete removes the selected node; deleting A fixes the new first point's time to zero.
- Undo/Redo retain at most 60 edits per tab. A drag is one edit, including cancellation or release outside the node. Reset graph is undoable.
- Editing pauses playback. Play/Stop/Reset, Predict and the learning tools remain the existing controls. Challenges are regenerated from the current custom mathematics.

Each graph has 2–12 points, at least 0.25 s apart, with duration at most 60 s. The editable vertical range is stable while dragging and adjustable in Edit points. Numeric values may expand it, up to ±1000 m for STVT or ±100 m/s for VTAT. The renderer includes 10% vertical padding. Position, derived axes and the road are bounded from polynomial extrema. Definitions with nonfinite values, invalid order, unsupported style or unsafe bounds preserve the last valid model and show an error.

## Common motion architecture

`custom-motion/builder-state.js` owns editable definitions and transactions. `custom-motion/custom-profile.js` validates and compiles definitions through the same `makeProfile` factory as presets. `custom-motion/builder-ui.js` provides the editor and draws nodes through the existing DPR-aware Graph context, with semantic transparent buttons as hit targets.

The resulting profile has the existing `segments`, `ranges`, `road`, `importantTimes`, `discontinuities`, `zeroCrossings`, `positionAt`, `velocityAt`, `accelerationAt`, `stateAt` and `interval` interface. It also exposes `distanceAt`, `displacementAt`, `speedAt` and `directionAt`. `simulation.js` switches the active model; it retains one shared Graph renderer, Timeline and activity implementation. There is no second playback or physics engine.

## Polynomial representation

Every segment stores coefficients in ascending powers of local time `u = t − segment.start`.

For adjacent primary coordinates `(t0,y0)` and `(t1,y1)`, let `h = t1−t0` and `d = (y1−y0)/h`.

Straight: `y(u) = y0 + d u`.

Smooth: `y(u) = y0 + m0 u + ((3d−2m0−m1)/h) u² + ((m0+m1−2d)/h²) u³`.

Endpoint tangents use the adjacent secant. Interior tangents are zero when adjacent secants have opposite signs or either is zero. Otherwise they use a weighted harmonic mean: `m = (w1+w2)/(w1/dLeft+w2/dRight)`, with `w1=2hRight+hLeft`, `w2=hRight+2hLeft`. Shared tangents make the primary curve C1 and preserve monotonicity within each segment. Second derivatives need not match at joins; STVT acceleration is correctly undefined when they do not. The UI displays rounded coefficients; evaluation uses full double precision.

STVT stores these as position coefficients. Velocity and acceleration follow by algebraic differentiation. VTAT stores the exact integral as position coefficients: `[positionAtStart, y0, c1/2, c2/3, c3/4]`. Position is carried continuously across boundaries. This extends the shared position representation through degree four to support cubic velocity.

Velocity zeros are found analytically using linear, quadratic and cubic formulas. The compiler caches roots and cumulative distance per segment. Distance is the sum of absolute position changes after splitting at velocity zeros, including partial segments. Displacement is always `s(t)−s(0)`. Neither depends on animation history or frame rate. The shared interval function uses cumulative custom distance; signed velocity area equals position change and acceleration area equals velocity change.

At unequal straight gradients, velocity (STVT) or acceleration (VTAT) is null at the corner. The existing renderer draws separate derivative sections with open endpoints, hides the tangent and derivative marker, and explains the one-sided values. Endpoint derivatives use the one-sided interval. Smooth primary joins do not create false first-derivative discontinuities.

## Scope

Drafts persist within the page session. Local saving, rename/load/delete, JSON import/export, preset-copy conversion and construction mini-challenges are optional and are not included. Segment style applies to the whole graph. Physical-device and manual screen-reader validation remain separate from the automated Edge tests.

Verification results are recorded in [CUSTOM-MOTION-VERIFICATION.md](CUSTOM-MOTION-VERIFICATION.md).
