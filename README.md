# Linear Motion Graph Lab

A single-page, smartphone-first simulation with **Displacement → Velocity** and **Velocity → Acceleration** tabs. Each tab retains its own timeline, predictions, activity answers and tool settings. Switching tabs pauses the outgoing motion.

Choose among **9 position-time profiles** and **8 velocity-time profiles** using the compact Motion graph menu. Both original journeys remain the defaults. Each tab retains its own selection; changing a motion pauses and resets that tab to zero. The graphs, car, values, axes, tools and challenges all use the selected mathematical model.

On screens wider than 900 px, the selector also presents a compact grouped graph library with real schematic previews. On phones and smaller tablets, the native select remains the primary control and **Browse graphs** opens the same library when wanted. The optional equation disclosure comes directly from each profile's metadata.

See [the complete profile equations, extension guide and upgrade verification](docs/MOTION-PROFILES.md).

## Run locally

Requires Node.js to run the optional development server:

```sh
npm start
```

Open **http://127.0.0.1:8000**. No package installation or build is needed to serve the application.

Deploy the project as a static website with `index.html` at its root. Runtime files are `index.html`, `js/` and `styles/`; no framework or production dependencies are used. Native modules require an HTTP server rather than opening the HTML using `file://`.

## Controls and learning tools

- Play / Stop / Reset and playback speed control both graphs. Drag either graph horizontally to scrub and pause; vertical touch scrolling remains available.
- Focus a graph: arrows move 0.1 s, Shift + arrow moves 1 s, Home / End select endpoints, Space plays/pauses, and R resets.
- Focus the tabs: Left / Right select the adjacent tab; Home / End select the first / last tab.
- The strip above the graphs shows the car and key values. Expand **Full live state & motion explanation** for position, displacement, distance, speed, direction, acceleration and corner explanations.
- Learning sections below the pair retain predictions, secants, signed/absolute areas, derived quantities, concepts, the polynomial example, ABCDE exercise, and eight challenges per tab.
- **Area explorer** also offers an average-acceleration secant from the starting time to the current time. At equal endpoints the average is undefined.

## Architecture and preservation

`js/app.js` owns the active simulation, global keyboard input and one resize observer. `js/tabs.js` manages accessible tabs. `js/simulation.js` scopes the controller and profile selection to each panel. Shared physics, timeline, graph and activity modules live in `js/shared/`; original motion coefficients remain in `js/st-vt/physics.js` and `js/vt-at/physics.js`. The registries in `js/motion-profiles/` define position polynomials for STVT and velocity polynomials for VTAT. The shared factory derives exact derivatives, integrated position, ranges, corners and reversal metadata. The renderer and controller contain no profile-specific motion branches.

Both complete source simulations were audited in the neighbouring `linear-motion` folder. Their identical shared modules were consolidated. No original physics formula or educational feature was removed. Average acceleration is derived from the interval calculation. Canvas resolution is capped at DPR 2; mobile ticks retain signed values. The separate polynomial and ABCDE exercises retain their own explicitly labelled examples; challenge mode follows the selected profile.

See [the feature inventory](docs/FEATURE-INVENTORY.md) and [verification report](VERIFICATION.md).

## Tests

For a fresh checkout, install development-only dependencies, then run:

```sh
npm ci
npm test
npm run test:browser
```

Browser tests default to installed Microsoft Edge. To use another installed Playwright channel set `BROWSER_CHANNEL`, for example `chrome`. Browser tests start and close their own server on port 8000; stop a running `npm start` server first. Screenshots and JSON results are generated in `test-results/`.

The tests cover analytic and numerical physics, corner limits, distance/integration, animation timing and cancellation, small-chart axes, all requested viewport sizes, independent tab state, accessibility, prediction and activity answers, pointer capture/cancellation, and mouse/touch/pen input.

## Scope of validation

Viewport sizes, orientation and touch are emulated in desktop Edge. Physical phones, iOS Safari and manual screen-reader use require separate device testing. Refresh-rate tests use injected timestamps. State persists across tab switches within the page, not across page reloads. Prediction deliberately hides the derived graph until revealed. No public deployment is performed by this project setup.
