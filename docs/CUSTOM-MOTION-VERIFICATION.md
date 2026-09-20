# Custom Motion Graph Builder — verification

Verified on 20 September 2026 in automated Microsoft Edge. All original tests remain present. Browser console-error and uncaught-error checks reported zero errors. Tests emulate viewports, orientation and touch; these results do not claim physical-device or manual screen-reader testing.

## General

| Requirement | Result |
|---|---|
| Preserved 9 STVT and 8 VTAT preset profiles | PASS |
| Custom STVT mode | PASS |
| Custom VTAT mode | PASS |
| Common motion-model interface | PASS |
| Same simulation engine and frame-independent Timeline | PASS |
| Only two main tabs | PASS |

## STVT builder

| Requirement | Result |
|---|---|
| Control-point editing | PASS |
| Touch dragging | PASS (emulated native touch plus cancellation events) |
| Mouse dragging | PASS |
| Pen input | PASS (Pointer Event emulation) |
| Keyboard editing | PASS |
| Numeric point editor | PASS |
| Add point | PASS |
| Delete selected point | PASS |
| Undo | PASS |
| Redo | PASS |
| Snap to visible minor ticks | PASS |
| Straight segments | PASS |
| Smooth segments | PASS |
| Exact velocity derivation | PASS |
| Undefined corner velocity | PASS |
| Tangent, including suppression at corners | PASS |
| Average velocity / secant | PASS |
| Distance | PASS |
| Signed displacement with nonzero initial position | PASS |

## VTAT builder

| Requirement | Result |
|---|---|
| Control-point editing through drag, keyboard and numeric inputs | PASS |
| Exact acceleration | PASS |
| Exact integrated position | PASS |
| Exact displacement | PASS |
| Distance through reversals | PASS |
| Zero-crossing detection | PASS |
| Acceleration corner handling | PASS |
| Velocity signed and absolute area | PASS |
| Acceleration area equals change in velocity | PASS |
| Car reversal | PASS |
| Straight / smooth, point operations and independent history | PASS |

## State and responsiveness

| Requirement | Result |
|---|---|
| Preset → Custom | PASS |
| Custom → Preset restores selected preset | PASS |
| STVT custom draft preserved | PASS |
| VTAT custom draft preserved | PASS |
| Independent tab state and histories | PASS |
| Orientation change | PASS |
| Edit while playing pauses safely | PASS |
| Duration reduction clamps timeline and tool bounds | PASS |
| Predict hides/reveals the current derived custom graph | PASS |
| Challenge questions follow current custom mathematics | PASS |
| Pointer cancellation, release and consecutive drags | PASS |
| No duplicate animation loop after rapid editing | PASS |

Each viewport below passed checks for both tabs: no horizontal page overflow, contained controls, 44-pixel node targets, visible primary/derived graphs, DPR rendering, visible car, numeric editing and preserved state through rotation.

| Viewport | Result |
|---|---|
| 320 × 568 | PASS |
| 360 × 640 | PASS |
| 375 × 667 | PASS |
| 390 × 844 | PASS |
| 412 × 915 | PASS |
| 768 × 1024 | PASS |
| 820 × 1180 | PASS |
| 1024 × 768 | PASS |
| 1180 × 820 | PASS |
| 1366 × 768 | PASS |
| 1440 × 900 | PASS |

Visual inspection: [STVT phone](screenshots/custom-stvt-phone.png), [VTAT desktop](screenshots/custom-vtat-desktop.png). Screenshots show the optional point editor expanded; it is collapsed by default.

## Accessibility

| Requirement | Result |
|---|---|
| Accessible non-drag editing | PASS |
| Keyboard editing without timeline conflicts | PASS |
| Visible focus and selected state beyond colour | PASS |
| Textual graph summary and final-edit announcement | PASS |
| Named controls, units, expanded panels and unique IDs | PASS |
| Automated full-page axe audit, both custom tabs | PASS |

## Tests

| Suite | Passed | Failed |
|---|---:|---:|
| All unit tests | 305 | 0 |
| All browser tests | 120 | 0 |
| Original unit tests, preserved | 264 | 0 |
| Original browser tests, preserved | 96 | 0 |
| New custom unit tests | 41 | 0 |
| New custom browser tests | 24 | 0 |

Custom unit breakdown (41 total):

| Coverage | Passed | Failed |
|---|---:|---:|
| STVT exact straight examples | 4 | 0 |
| VTAT exact straight examples | 4 | 0 |
| Multisegment integration | 1 | 0 |
| Corner left / exact / right limits | 4 | 0 |
| Numerical derivative/integral cross-checks and deterministic seeking | 4 | 0 |
| Smooth joins and no primary overshoot | 2 | 0 |
| Acceleration area identity | 1 | 0 |
| Analytic cubic roots | 4 | 0 |
| Validation and last-valid-model safety | 11 | 0 |
| Undo/Redo transactions in both families | 2 | 0 |
| Editing constraints and bounded history | 1 | 0 |
| Extreme bounded smooth drafts | 1 | 0 |
| Canvas corner rendering and finite coordinates | 2 | 0 |

Custom browser breakdown (24 total): 2 numeric integration/tool tests, 2 drag/keyboard/history/playback tests, 2 structural/state/validation tests, 2 touch/pen/cancellation tests, 11 responsive tests, 2 accessibility tests, 2 snap and drag/numeric-equivalence tests, and 1 reversal/area/rapid-edit test. All passed; no skipped or flaky tests in the combined run.

Commands: `npm test` and `npm run test:browser -- --output=test-results/final-builder --reporter=line,json`. Machine-readable combined browser results: `test-results/custom-final-results.json` (ignored generated output).

## Architecture and mathematics

Custom definitions compile into the existing profile factory and the same position-polynomial model used by presets. The shared Graph, Timeline, physics functions and activities consume the active profile. STVT straight segments are linear position; VTAT straight segments integrate linear velocity to quadratic position. Smooth graphs use explicitly stored shape-preserving cubic Hermite primary coefficients; VTAT integrates them to quartic position. Analytical derivatives, roots, integrals and precomputed cumulative distance synchronize every consumer. See [the full representation and interpolation equations](CUSTOM-MOTION.md#polynomial-representation).

## Bugs found and resolved

- Correcting a rejected numeric draft back to its previous valid value could leave a stale error. Invalid drafts now remain visible until corrected, and valid changes clear feedback.
- Programmatic or pointer focus on graph nodes lacked a strong outline. Focus now has an explicit visible ring.
- Expanded builder controls displaced the primary graph from its derived partner. The toolbar now sits above both graphs; detailed inputs follow the primary graph.
- The full-page accessibility audit found the existing tab list outside a navigation landmark. It now has a named navigation wrapper.
- The acceleration note treated every derivative discontinuity as a velocity jump. It now distinguishes continuous velocity with unequal acceleration limits from a true velocity jump.

Physics corrections: the last item corrects the educational explanation. Existing preset equations, distance calculations and playback timing were preserved; cubic-root support and quartic position are extensions for the new model.

## Files

Added: `js/custom-motion/custom-profile.js`, `js/custom-motion/builder-state.js`, `js/custom-motion/builder-ui.js`, `tests/custom-motion.test.js`, `tests/custom-motion.spec.js`, `docs/CUSTOM-MOTION.md`, this report, `docs/screenshots/custom-stvt-phone.png`, `docs/screenshots/custom-vtat-desktop.png`.

Modified: `js/simulation.js`, `js/shared/physics-core.js`, `js/shared/graph.js`, `js/motion-profiles/profile.js`, `styles/layout.css`, `index.html`, `README.md`.

## Known limitations

- Graph style is global; mixed straight/smooth sections are not included.
- Drafts survive tab/source/orientation changes within the page, but are not saved across reloads. Optional local storage, saved-graph management, JSON import/export, preset-copy conversion and construction mini-challenges are not included.
- Limits are 12 points, 60 seconds and bounded primary values. Closely spaced points can be easier to edit through the numeric table.
- Tests use desktop Edge with emulated touch/orientation. Physical phones/tablets, iOS Safari and manual screen-reader use remain unverified. The interactive Browser connection was unavailable in this session.
