# LINEAR MOTION GRAPH LIBRARY UPGRADE

Architecture: the existing two-tab simulation, canvas renderer, timeline, car, tools and activities are extended. STVT authors supply position coefficients; VTAT authors supply velocity coefficients which are integrated analytically into the shared position representation. The same deterministic model supplies position, velocity, acceleration, distance, graph geometry, road geometry, live state, tangents, secants, areas and challenge answers. There is no numerical differentiation or frame integration in production physics.

The registries contain **9 STVT profiles** and **8 VTAT profiles**. Both original journeys remain selected by default. A native, labelled, category-grouped menu appears directly under the app tabs. Changing it pauses playback, releases any captured pointer, resets time and interval endpoints, clears the old prediction and challenge answer, and updates the complete simulation. Predict mode stays hidden if it was hidden, and reveals the newly selected graph. Each tab retains its own chosen profile, playback position and tool state across tab switches.

## STVT profiles

Time `t` is in seconds; position `s` is in metres. For piecewise formulas below, use `u = t − start` for each listed interval. Durations start at zero. At shared endpoints the position is continuous; derivatives are undefined where the corresponding one-sided slopes disagree.

| Profile name | Primary position definition | Duration | Learning objective |
|---|---|---|---|
| Original five-stage journey | 0–5: `2t²`; 5–10: `50+20u−2u²`; 10–15: `100`; 15–25: `100−20u`; 25–30: `−100+20u` | 30 s | Curved slopes, rest and idealised velocity jumps |
| Uniform forward motion | `s = 5+3t` | 10 s | Constant positive slope; position differs from displacement |
| Stationary object | `s = 12` | 8 s | Horizontal position, zero velocity and zero distance |
| Uniform backward motion | `s = 20−4t` | 10 s | Negative velocity while accumulated distance grows |
| Speeding up forward | `s = t²/2` | 10 s | Increasing positive gradient and positive acceleration |
| Slowing down forward | `s = 10t−t²/2` | 8 s | Decreasing positive slope without reversal |
| Forward → stop → reverse | `s = 8t−t²` | 8 s | Smooth reversal at 4 s, where velocity is zero |
| Forward, rest, backward, rest | 0–3: `4t`; 3–5: `12`; 5–9: `12−3u`; 9–12: `0` | 12 s | Stationary intervals versus undefined velocity at sharp corners |
| Smooth changing motion | `s = 3t²−t³/3` | 12 s | Continuously changing velocity; acceleration changes sign at 3 s and velocity at 6 s |

For the smooth changing journey, `v = 6t−t²`, `a = 6−2t`, maximum position is 36 m, final position is −144 m, and distance is 216 m. This is labelled as a challenge / extension.

## VTAT profiles

Velocity `v` is in metres per second. All VTAT presets start at `s(0) = 0`. Their position is `s(t) = ∫₀ᵗ v(τ)dτ`, with integration constants propagated continuously across stages. Acceleration is the analytical derivative of velocity, with isolated sharp corners left undefined.

| Profile name | Primary velocity definition | Duration | Learning objective |
|---|---|---|---|
| Original multi-stage journey | 0–4: `5t`; 4–8: `20`; 8–12: `20−12.5u`; 12–18: `−30+5u` | 18 s | Acceleration, cruise, reversal at 9.6 s, backward deceleration; signed versus absolute area |
| Constant forward velocity | `v = 4` | 10 s | Positive constant velocity and zero acceleration |
| Accelerating from rest | `v = 2t` | 8 s | Constant acceleration and triangular displacement area |
| Slowing down forward | `v = 12−2t` | 6 s | Negative acceleration slows forward motion to rest |
| Forward → stop → reverse | `v = 8−2t` | 8 s | Negative acceleration slows forward motion, then speeds backward motion |
| Backward → stop → forward | `v = −6+2t` | 6 s | Positive acceleration reverses backward motion at 3 s |
| Accelerate, cruise, decelerate | 0–3: `3t`; 3–7: `9`; 7–10: `9−3u` | 10 s | Piecewise constant acceleration; undefined at 3 and 7 s |
| Constant backward velocity | `v = −5` | 8 s | Negative velocity with zero acceleration |

The original VTAT mathematics is unchanged: maximum position 136 m at 9.6 s, final position/displacement 10 m, total distance 262 m. The original STVT journey still has 400 m distance and zero net displacement.

## Extending the library

1. Add one definition to `stvt-profiles.js` or `vtat-profiles.js`, with a unique `profileId`, meaningful title, short description, category, learning focus, equation and segment list.
2. STVT segments use ascending position coefficients in local time `u = t − start`: `[s₀,v₀,a₀/2,jerk/6]`, omitting trailing zeros. VTAT `velocitySegments` use ascending velocity coefficients; the factory integrates them exactly. The current factory supports position through cubic degree (velocity through quadratic degree).
3. Keep position continuous. VTAT velocity must also be continuous so the finite acceleration integral equals the velocity change. STVT velocity jumps are allowed and explicitly reported as undefined at the corner.
4. Add any profile-specific expected values to tests. The generic validation, derivative, integral, corner, graph, selector and responsive tests automatically iterate all registered profiles.

The factory calculates extrema from exact derivative roots, pads finite graph/road bounds, and creates discontinuity, important-time and zero-crossing metadata. Original road bounds are retained as preferred bounds. Total distance sums absolute position changes after splitting intervals at every velocity root and every segment boundary. Numeric differentiation/integration appears only in validation tests. All graph ranges include zero; distance shading expands velocity bounds when reflecting negative regions above zero. The car uses deterministic incoming orientation at rest, including when seeking directly to a turning point.

## Final verification

| Requirement | Result |
|---|---|
| STVT selector | PASS |
| VTAT selector | PASS |
| Original STVT profile preserved | PASS |
| Original VTAT profile preserved | PASS |
| At least 8 STVT profiles | PASS — 9 |
| At least 8 VTAT profiles | PASS — 8 |
| Meaningful profile titles | PASS |
| Profile descriptions | PASS |
| STVT position → velocity | PASS |
| VTAT velocity → acceleration | PASS |
| VTAT velocity → position integration | PASS |
| Distance calculations | PASS |
| Displacement calculations | PASS |
| Direction reversal | PASS |
| Speeding/slowing classification | PASS |
| Sharp-corner handling | PASS |
| Dynamic graph axes | PASS |
| Dynamic road axes | PASS |
| Timeline adapts | PASS |
| Car adapts | PASS |
| Tangent adapts | PASS |
| Average velocity adapts | PASS |
| Area tool adapts | PASS |
| Predict mode adapts | PASS |
| Challenges adapt | PASS |
| Tab state preservation | PASS |
| Profile change while playing | PASS |
| Profile change after seeking near the end of a longer motion | PASS |
| Rapid profile switching | PASS |
| No duplicate RAF | PASS — one while playing; none after reset/settled resize |
| No NaN | PASS |
| No console errors | PASS |
| Selected profile and physical state survive resizing | PASS |

## Responsive verification

Every listed size is exercised with all 17 profiles. Assertions cover accessible native menus, no horizontal page overflow, control bounds, graph size, car containment and non-overlapping road labels. Small-chart unit tests verify finite geometry and tick placement; screenshots were inspected at 320 px and desktop width. Expanded learning panels, zoom, touch/pointer behaviour and reduced motion remain covered by the original browser suite.

| Viewport | Selector, overflow, graphs, car, controls, road labels |
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

## Automated test report

Final test counts are recorded below after executing the final source tree. Category counts for new unit tests are mutually exclusive; browser subsets overlap with the total browser count.

| Tests | Passed | Failed |
|---|---:|---:|
| Profile validation | 17 | 0 |
| Analytical/numerical derivative checks | 17 | 0 |
| Integral checks: 17 velocity + 17 absolute velocity + 8 acceleration | 42 | 0 |
| Zero-crossing tests | 5 | 0 |
| Corner tests | 17 | 0 |
| Profile activity tests | 17 | 0 |
| Profile graph-rendering tests | 17 | 0 |
| Library preservation and special regressions | 3 | 0 |
| Original unit tests | 110 | 0 |
| **All unit tests** | **245** | **0** |
| Selector browser tests | 17 | 0 |
| New responsive browser tests, each covering all 17 profiles | 11 | 0 |
| Other new browser tests: switching, resizing, accessibility | 3 | 0 |
| Original browser tests | 50 | 0 |
| **All browser tests** | **81** | **0** |
| All responsive browser tests, including original suites | 37 | 0 |

Console/page errors: **0**. Accessibility: native keyboard selection and axe audits of expanded panels pass. Browser: installed Microsoft Edge via Playwright; DPR capped at 2.

Exact commands run:

```powershell
npm test
node --test tests/motion-profiles.test.js
npm run test:browser -- --output=test-results/profile-upgrade --reporter=list
npm run test:browser
git diff --check
```

The intermediate browser run passed 80 tests; the final run includes the additional selected-profile resize regression and passes 81. The initial sandboxed browser attempts could not write artifacts; the successful runs used elevated execution permission. The in-app Browser connection was unavailable. Final JSON results are in `test-results/results.json`; Playwright screenshots are under `test-results/`. These generated files are ignored by Git.

## Files modified

- `index.html` — labelled compact menus, profile notes, duration labels, correct position heading; separate ABCDE exercise labelled explicitly.
- `js/app.js` — registries passed into the existing simulations.
- `js/simulation.js` — atomic profile reset, dynamic models/ranges, descriptions, accessibility announcements, orientation, interval tools and prediction context.
- `js/shared/physics-core.js` — exact polynomial derivatives and roots; distance split at all reversals.
- `js/shared/graph.js` — shading splits at exact roots.
- `js/shared/activities.js` — profile-aware challenges with answers from the current physics.
- `styles/layout.css` — compact responsive selector.
- `README.md` — usage and architecture.
- `VERIFICATION.md` — link to this upgrade report, retaining the historical report.

## Files added

- `js/motion-profiles/profile.js`
- `js/motion-profiles/stvt-profiles.js`
- `js/motion-profiles/vtat-profiles.js`
- `tests/motion-profiles.test.js`
- `tests/motion-profiles-graph.test.js`
- `tests/motion-profiles.spec.js`
- `docs/MOTION-PROFILES.md`

## Important bugs found and physics corrections

- Fixed-profile graph bounds, duration labels, road marks, educational notes and challenges would have retained original-journey values after a selection. They now follow the profile.
- The original quadratic-only distance/area split was insufficient for a cubic position curve. Exact derivative roots now split all monotonic intervals.
- Reflected distance shading for an entirely negative velocity curve would have been clipped above the old positive bound. Its axis now expands to fit the absolute area.
- Zero velocity previously forced the car to face forward. Direct seeking to a stop now chooses the incoming physical direction deterministically, including throughout a stationary interval after backward motion.
- Motion explanations now name the current instant; a momentary stop is not presented as the state of an entire following interval.
- Position is explicitly distinguished from displacement for nonzero starting positions. The primary STVT heading is Position–Time; accumulated distance never decreases.
- A new generated motion-state question needed to offer “instantaneously at rest” at a smooth reversal; this was corrected before the final run.
- Original equations and corner rules were already correct and remain unchanged. No fake finite derivative or tangent is drawn at a sharp corner.

## Overall result and genuine limitations

Original simulations preserved: **PASS**. All derived graphs, car motion and live values synchronized: **PASS**. Physics validation: **PASS**. Mobile/tablet/desktop: **PASS** in the tested viewport emulation. Accessibility: **PASS** for automated audits and keyboard checks.

Physical phones, iOS Safari and manual screen-reader testing were not available. Profile choices persist across tab switches within the current page, not page reloads. The factory intentionally supports polynomial presets through cubic position; sinusoidal or higher-degree extensions would require additional exact root/extrema support. Separate polynomial and ABCDE worked examples retain their own stated motions, while challenge mode tracks the selected profile.
