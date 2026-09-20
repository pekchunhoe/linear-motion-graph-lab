# Motion profile library upgrade

The latest verification and complete equations are in [docs/MOTION-PROFILES.md](docs/MOTION-PROFILES.md). The original combined-app report below is retained as historical evidence.

# COMBINED LINEAR MOTION GRAPH LAB

Implemented and verified locally on 14 September 2026 in `D:\Physics Simulation\linear-motion-lab`.

Architecture: one static HTML page with native JavaScript modules, accessible in-page tabs, and independently scoped simulation controllers. The original shared physics, animation, graph and activity engines were reused. One global keyboard dispatcher and one coalesced resize observer serve the active tab. Both original source projects in the neighbouring `linear-motion` folder remain untouched.

PASS below refers to automated Edge browser testing, numerical/unit tests and source/visual inspection as described under validation scope.

## TOP TABS

| Check | Result |
|---|---|
| s–t → v–t | PASS |
| v–t → a–t | PASS |
| No page reload | PASS |
| Independent tab state | PASS |

## s–t → v–t

| Check | Result |
|---|---|
| Displacement graph | PASS |
| Velocity graph | PASS |
| Graphs close together | PASS — 6 px phone gap |
| Time synchronization | PASS |
| Tangent | PASS |
| Secant | PASS |
| Prediction | PASS |
| Worked example | PASS — 12 m/s, 15 m/s, 1.2 m/s² |
| Challenges | PASS |

## v–t → a–t

| Check | Result |
|---|---|
| Velocity graph | PASS |
| Acceleration graph | PASS |
| Graphs close together | PASS — 6 px phone gap |
| Time synchronization | PASS |
| Tangent | PASS |
| Prediction | PASS |
| Area explorer | PASS — signed / absolute velocity area and acceleration area |
| Derived position | PASS |
| ABCDE activity | PASS |
| Challenges | PASS |
| Average acceleration secant | PASS — Δv/Δt; equal endpoints guarded |

## PHYSICS

| Check | Result |
|---|---|
| slope s–t = v | PASS |
| slope v–t = a | PASS |
| area v–t = displacement | PASS |
| area \|v\| = distance | PASS |
| area a–t = Δv | PASS |
| sharp corners preserved | PASS |
| direction reversal correct | PASS |
| Horizontal position → v = 0 | PASS |
| Horizontal velocity → a = 0 | PASS |
| Positive / negative slopes retain derivative sign | PASS |
| Secant gives Δs/Δt; tangent gives instantaneous v | PASS |
| Displacement distinct from nondecreasing accumulated distance | PASS |

Tab 1 ends with 0 m displacement and 400 m distance. Velocity is undefined at 15 and 25 s; acceleration is also undefined at 5 and 10 s. The ideal velocity jumps retain the impulse explanation. Tab 2 reverses at 9.6 s, reaches 136 m maximum position, and ends at 10 m displacement after travelling 262 m. Acceleration is undefined at 4, 8 and 12 s. Negative acceleration is interpreted using velocity sign, including the ABCDE activity.

## RESPONSIVE

| Check | Result |
|---|---|
| 320 × 568 | PASS |
| 360 × 640 | PASS |
| 375 × 667 | PASS |
| 390 × 844 | PASS |
| 412 × 915 | PASS |
| 430 × 932 | PASS |
| Tablet portrait — 768 × 1024, 820 × 1180 | PASS |
| Tablet landscape — 1024 × 768, 1180 × 820 | PASS |
| Laptop — 1280 × 720, 1366 × 768 | PASS |
| Desktop — 1440 × 900 | PASS |
| No horizontal overflow | PASS — collapsed and fully expanded learning panels |
| Phone motion strip compact | PASS — 76 px |
| Equal plotting widths / aligned time axes | PASS |
| Readable signed ticks and units on compact canvases | PASS |

Phone canvases are 145–181 px high. Graph cards remain adjacent with no motion or activity panel between them. Graphs become equal-width side-by-side cards at 1000 px. Main graphs are initially visible; the user can explicitly hide the derived graph during prediction.

## INTERACTION

| Check | Result |
|---|---|
| Mouse | PASS |
| Touch | PASS — emulated |
| Pointer drag | PASS |
| Pointer capture, release, cancellation | PASS |
| Pen / ignored secondary pointers | PASS |
| Keyboard | PASS |
| Orientation change | PASS — viewport rotation, including 568 × 320 |
| Play / Stop / Reset / speed / slider | PASS |
| Predictions in both tabs | PASS |
| Secant / area / polynomial / ABCDE / challenge feedback | PASS |
| Accessibility | PASS — axe WCAG A/AA, focus, unique IDs and reference validation |
| Reduced motion and zoom permitted | PASS |

## PERFORMANCE

| Check | Result |
|---|---|
| Single active animation lifecycle | PASS — outgoing tab cancels animation; independent hidden time remains stable |
| No duplicate listeners | PASS — setup runs once; repeated switching and single-step keyboard checks remain stable |
| No console errors | PASS — all 50 browser tests |
| Canvas backing resolution bounded | PASS — DPR capped at 2, including DPR 4 unit checks |
| No per-frame DOM reconstruction | PASS — initial activity markup created once; live text and canvas updated in place |

## Test evidence

Final commands:

```sh
npm test
npm run test:browser
```

Results: **110 unit / numerical tests passed; 50 browser tests passed; 160 total; zero failures.** Final browser suite completed in 40.2 seconds with exit code 0. JSON results and 28 generated screenshots are under `test-results/`. Development dependencies were reused from the original project's installed modules after the offline npm cache lacked registry metadata; the matching lockfile is included for clean `npm ci` installation.

Visual inspection identified insufficient vertical ticks on the shortest charts. The adaptive tick density was corrected and regression tests now require positive, zero and negative axis values on every small chart. The final screenshots were inspected again. No physics equations were changed by this fix.

Representative screenshots:

- [Tab 1 — 320 px phone](docs/screenshots/st-vt-phone.png)
- [Tab 2 — 390 px phone](docs/screenshots/vt-at-phone.png)
- [Desktop graph pair](docs/screenshots/desktop.png)

## Files created

The target workspace was initially empty. Final project files:

```text
.gitignore
index.html
package.json
package-lock.json
playwright.config.js
README.md
VERIFICATION.md
docs/FEATURE-INVENTORY.md
docs/screenshots/st-vt-phone.png
docs/screenshots/vt-at-phone.png
docs/screenshots/desktop.png
styles/base.css
styles/layout.css
js/app.js
js/tabs.js
js/simulation.js
js/shared/physics-core.js
js/shared/animation.js
js/shared/graph.js
js/shared/activities.js
js/st-vt/physics.js
js/vt-at/physics.js
tests/animation.test.js
tests/compact-graphs.test.js
tests/st-vt-physics.test.js
tests/st-vt-graph.test.js
tests/vt-at-physics.test.js
tests/vt-at-graph.test.js
tests/st-vt.spec.js
tests/vt-at.spec.js
tests/tabs.spec.js
tests/server.js
tests/browser-setup.js
```

Generated and ignored: `node_modules/` dependencies and `test-results/` screenshots, test metadata and JSON report. Temporary import scripts were removed after consolidation.

Files modified: **none that existed at the start of this task**. Imported copies were adapted in the new workspace; the two originals were not edited.

Files deleted: **no pre-existing files**.

## Formula changes, retained features and limitations

- Original physics formulas changed: **No**. The model coefficients, exact derivatives, distance integrals and polynomial example are preserved. Added average acceleration uses the existing Δv divided by Δt; the existing secant renderer now supports the velocity graph as well as the position graph.
- Original features removed: **No**. Full live-state values and explanations were moved into a collapsible section, and all advanced tools follow the main graph pair. See the pre-implementation [feature inventory](docs/FEATURE-INVENTORY.md).
- Remaining known limitations: physical smartphones, iOS Safari and manual screen-reader usability were not tested. Touch, pen, viewport sizes and orientation were emulated in installed Edge. Refresh-rate checks use injected timestamps. State is retained within the open page, not across reloads. On the shortest phones a small vertical scroll is needed to see the bottom of the second graph. No public deployment was performed.

## Local preview

Run `npm start` and open `http://127.0.0.1:8000`. Application serving needs no npm installation or build; test tooling alone has development dependencies. Deploy `index.html`, `js/` and `styles/` to any static web host.
