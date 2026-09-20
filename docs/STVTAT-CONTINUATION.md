# STVTAT COMPLETE MOTION TAB — CONTINUATION REPORT

Continuation date: 20 September 2026.

## Partial work recovered

The starting working tree contained changes to `index.html`, `js/app.js`,
`js/custom-motion/builder-ui.js`, `js/custom-motion/custom-profile.js`,
`js/shared/graph.js`, and `js/shared/profile-browser.js`. It also contained
untracked `js/combined/{profiles,view,builders}.js` and `js/shared/time-axis.js`.
All were inspected before editing. Correct work was retained.

| Feature | State at handoff | Finding |
| --- | --- | --- |
| Third top tab | Partial | Navigation and app registration existed; controller ignored the combined option. |
| Three stacked graphs | Partial | Cloned markup existed; controller instantiated only two graphs. |
| Shared time geometry | Partial | Helper and renderer support existed, but were not connected. |
| Combined registry / ten presets | Implemented | Ten metadata adapters reused existing validated profile coefficients and methods. |
| Preset selector | Partial | Shared browser markup and preview adapter existed. |
| Car / origin / playback | Partial | Shared components and cloned controls existed; combined synchronization remained unwired. |
| Position custom source | Partial | Managed builder and wrapper existed; controller did not instantiate them. |
| Velocity custom source | Partial | Independent managed builder existed; controller integration was missing. |
| Initial position | Partial | Exact integration offset and input existed; complete UI wiring and validation checks were missing. |
| Undo/Redo / Straight/Smooth | Partial | Existing shared builder supported them; combined source integration was missing. |
| Predict | Partial | Single-derived-graph markup had been cloned; two-target workflow was missing. |
| Area tools | Partial | Controls and renderer existed; combined routing and velocity-jump explanation were missing. |
| Challenges | Partial | Shared generation existed; combined activity setup needed to omit absent standalone exercises. |
| Linked intervals | Partial | Highlight drawing and controls existed; controller routing was missing. |
| Responsive layout | Missing | No combined layout rules; navigation still used two columns. |
| Combined tests | Missing | No combined-specific test files existed. |

## Completed in this run

- Connected all three graphs, car, timeline, and nine live values to one model and playback controller.
- Connected the existing shared time geometry after graph sizing and builder range preparation. Quantity axes retain independent units and ranges.
- Connected two existing builders with independent drafts, histories, selected points, snap, style, and editable-range settings. Preset and each draft restore their own playback time; speed remains local to the tab.
- Finished the velocity-source initial-position input and its undo/redo behavior. Position uses `s₀ + ∫v dt`; displacement and distance do not depend on s₀.
- Routed both exact tangent tools and both area tools to the correct graphs. Intervals containing velocity jumps explicitly explain why finite acceleration area cannot account for the instantaneous change. No spikes or averaged corner derivatives were introduced.
- Implemented staged prediction for position and velocity sources, keeping the source visible and revealing the other graphs in sequence.
- Connected linked time intervals across all three plots, including segment selection from graph scrubbing or custom point selection.
- Completed compact three-tab navigation, phone graph stacks, and landscape graphs beside car/values/playback/tools.
- Preserved shared profile browsing, equations, selected cards, challenges, motion-track origin mapping, and original-tab activities.
- Added 50 unit tests and 31 browser tests. Expanded the existing tab keyboard test for three tabs; no old tests were removed.

## Feature results

| Requirement | Result |
| --- | --- |
| Third tab | PASS |
| Three synchronized graphs | PASS |
| Shared time x-axis | PASS |
| Separate y-axes | PASS |
| Pixel alignment | PASS — actual canvas cursor strokes agree within 0.1 CSS pixel |
| Preset mode | PASS |
| Combined presets | 10 profiles |
| Custom Position source | PASS |
| Custom Velocity source | PASS |
| Initial position s₀ | PASS |
| Position smooth derivation | PASS — exact polynomial derivatives |
| Velocity integration | PASS — analytic segment integration |
| Corner treatment | PASS |
| Velocity-jump acceleration treatment | PASS |
| Car | PASS |
| Origin | PASS |
| Area tools | PASS |
| Predict mode | PASS |
| Linked interval highlighting | PASS |
| Only active tab animates | PASS |
| State preservation | PASS |
| Original STVT regression | PASS |
| Original VTAT regression | PASS |
| Responsive | PASS |
| Accessibility | PASS |

## Test results

| Suite / subset | Passed | Failed |
| --- | ---: | ---: |
| Unit, complete suite | 359 | 0 |
| Browser, complete suite | 165 | 0 |
| Combined physics (`combined-physics.test.js`) | 47 | 0 |
| Alignment unit tests | 3 | 0 |
| Combined browser tests | 31 | 0 |
| Custom Position, focused combined browser tests | 2 | 0 |
| Custom Velocity, focused combined browser tests | 3 | 0 |
| Combined responsive and rendered alignment tests | 11 | 0 |
| Combined automated accessibility tests | 3 | 0 |

Console errors: **0**. Full browser run: **165 passed**, **0 failed**, **0 skipped**,
**0 flaky**, in 3.3 minutes. All 134 existing browser tests passed alongside the
31 new combined tests, including the original tabs' automated accessibility checks.

Subsets overlap with suite totals. Additional browser tests cover all ten presets,
independent draft/tab state, and animation ownership. All combined browser tests
assert no page errors or console errors. The original unit baseline was 309;
the existing browser suite contains 134 tests, retained alongside 31 new tests.

Alignment uses the actual cursor stroke coordinates at t = 0, 1.23, 6, and 12 s
in all three modes at every requested viewport. Unit checks additionally cover
the model endpoint and a deliberately wide signed vertical scale. The focused
physics cases include both specified three-point graphs, a smooth position
profile, s₀ = 0 and 30, reversal, distance, and origin crossing.

Viewport matrix: 320×568, 360×640, 375×667, 390×844, 412×915, 768×1024,
820×1180, 1024×768, 1180×820, 1366×768, and 1440×900. Each combined viewport
test checks all three modes, cursor alignment, graph spacing, car containment,
visible control containment, and absence of horizontal page overflow.
Phone and desktop screenshots were visually reviewed.

Accessibility verification uses axe in Preset and both Custom sources at 320 px,
including expanded editing and learning panels. The shared tab test checks
keyboard wraparound, Home/End, focus, unique IDs, and ARIA reference targets.

## Files modified

- `README.md`
- `index.html`
- `js/app.js` (recovered wiring retained)
- `js/custom-motion/builder-ui.js`
- `js/custom-motion/custom-profile.js` (recovered integration retained)
- `js/shared/activities.js`
- `js/shared/graph.js` (recovered drawing support retained)
- `js/shared/profile-browser.js` (recovered preview support retained)
- `js/simulation.js`
- `styles/layout.css`
- `tests/tabs.spec.js`

## Files added relative to HEAD

- `js/combined/builders.js` — recovered
- `js/combined/profiles.js` — recovered
- `js/combined/view.js` — recovered and completed
- `js/shared/time-axis.js` — recovered
- `js/combined/tools.js` — new in this continuation
- `tests/combined-physics.test.js` — new
- `tests/combined-alignment.test.js` — new
- `tests/combined.spec.js` — new
- `docs/STVTAT-CONTINUATION.md` — this report

## Cleanup and limitations

`git diff --check` passes. The project has no formatter or lint command. No
debug logging or production testing hooks were added; canvas/RAF instrumentation
exists only inside the browser tests.

Draft state is retained within the open page, following existing application
behavior; reloading resets it. Browser verification uses the project's Microsoft
Edge / Chromium Playwright configuration. The in-app Browser connection was
unavailable. No physical-device, Firefox, or Safari verification is claimed.
