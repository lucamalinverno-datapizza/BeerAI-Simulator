# BeerAI — Brewery Control Room 3D

An explorable brewery digital twin for teaching production capacity, order commitments and delays.
The guiding question is: **Can we accept a new order without compromising existing commitments?**
All data are synthetic; Beer A and Beer B are teaching products.

For agents operating the visible simulator, read the
[computer-use UX/UI guide](agent_instructions/COMPUTER_USE_GUIDE.md). It covers navigation and
every existing user-facing workflow, with adaptable examples and camera troubleshooting.

## Start the application

Double-click **Start_BeerAI.command** on macOS (the original **Avvia_BeerAI.command** shortcut also works),
or run `npm start`. The browser opens at http://127.0.0.1:4173/.
If this port is busy, the server tries the next ten ports and prints the actual URL.
Stop with Ctrl+C in the Terminal. Choose a port with `BEERAI_PORT=4180 ./Start_BeerAI.command`.

Requires Node.js >=20.19, tested with 24.13.1, and a WebGL-enabled browser.
The launcher serves the compiled build on 127.0.0.1; no installation or downloads occur at startup.
All geometries, fonts, textures and calculations are local.

For the standalone 2D fallback, double-click **fallback/beerai-control-2d.html**. It runs without a
server, WebGL or network and uses the same engine and presets. In-app: **2D control room**.

## Staff avatars and third-person Explore

Six staff members patrol the brewery: Alex (Brewer), Maya (Packaging), Sam (Warehouse), Jordan
(Dispatch), Taylor (Quality) and Riley (Engineering). Their routes avoid machinery, racks, tanks
and walls, including additional tanks. Walking animates their arms and legs.

1. Choose a staff member under **Your avatar**, then click **Explore**. Alternatively, click a
   person in the 3D scene to take control directly.
2. Move with **WASD / arrows**, run with **Shift**, orbit the follow camera by **dragging** or
   pressing **Q/E**, and zoom with the **scroll wheel**.
3. A blue helmet, blue ground ring and **YOU** nameplate identify the controlled avatar. The
   other people continue their patrols. Switch avatars at any time using the selector.
4. **Capture mouse** offers continuous mouse orbit; **Esc** releases it. Fields and selectors
   suspend movement while you type. Esc also releases field focus.
5. **Overview** returns to the orbitable plant view. Guided views visit each department;
   **Focus selected** frames the selected machine. In Explore the minimap tracks your avatar;
   blue dots show all staff members.

The follow camera shortens its distance before crossing walls or equipment. Characters remain
on the floor and cannot pass through machinery. Staff movement is illustrative: staffing is not
a capacity constraint in the numerical model. It does not change production, stock or order results.
Reduced-motion preferences suppress limb swing and camera transition animations.

## Operational controls

Click a machine or its Equipment-list entry to open the same operational panel.

| Equipment | Information and editable inputs |
|---|---|
| Fermenter F1–F8 | Product, batch, volume, release/cleaning, timeline, utilisation; capacity and unavailability windows. Inspect contents shows the volume/capacity level. |
| Empty slot | Add a fermenter, available from day 0 in the counterfactual scenario. |
| Brewhouse | Batch starts and blocked days; daily batch limit, batch volume, cleaning, horizon and product residence times. |
| Packaging line | FIFO buffer and daily throughput; packaging capacity in hL/day. |
| Warehouse | Packaged stock, product curves and FIFO traceability; initial stock. |
| Shipping dock | Orders, partial deliveries, delays and source batches; add, edit or delete orders. Who is late? filters late orders. |
| Control terminal | KPIs, mass balance, order table, timeline and event log. |

Editing inputs marks results **not up to date**. **Run simulation** recalculates from day 0 in a
Web Worker; superseded runs are discarded. **Play/Pause**, the day slider and playback speed change
only the displayed day. **Reset to baseline** restores S0 exactly.

**Save scenario** stores a local copy. **Compare scenarios** shows up to four runs side by side.
**Export JSON** downloads the current configuration; **Import JSON** reads a selected local file.
The six supplied configurations are in `scenarios/`. Browser storage is optional.

## Reference scenarios

| Scenario | Change | Volume service | Complete on time | On time / demand |
|---|---|---:|---:|---:|
| S0 | Existing commitments | 100.00% | 7/7 | 155 / 155 hL |
| S1 | Festival O08: Beer A, 40 hL, due day 21 | 92.31% | 6/8 | 180 / 195 hL |
| S2 | S1 + packaging at 60 hL/day | 92.31% | 6/8 | 180 / 195 hL |
| S3 | S1 + empty F5, 20 hL, available day 0 | 97.44% | 7/8 | 190 / 195 hL |
| S4 | S0 with order quantities x1.30 | 83.13% | 5/7 | 167.5 / 201.5 hL |
| S5 | S0 with F4 unavailable [0,21) | 93.55% | 5/7 | 145 / 155 hL |

Final backlog is zero in all six cases. These values are calculated by the engine, not inserted
into the UI. `scenarios/engine_results_summary.json` is generated by the build.

## Development and verification

```bash
npm install             # preparation only; use the supplied lockfile
npm run dev             # http://127.0.0.1:5173
npm test                # numerical engine, store and spatial navigation tests
npm run build           # typecheck, 3D build, standalone 2D fallback and scenario JSON
npm run test:e2e        # local Chrome via playwright-core; no browser download
npm run package:stable -- --date 2026-11-12
```

URL options: `?scenario=S3`, `?day=21`, `?quality=reduced`, `?view=2d`.

The compiled build is included in `dist/`, so the launcher works without installing dependencies.
You can generate a separate stable package with the command above; packaging refuses to overwrite
an existing folder unless `--force` is explicitly passed.

See `RISULTATI_VERIFICATI.md` for the current validation record.

## Architecture

- `src/simulation/`: pure TypeScript engine, validation, snapshots, events, KPIs and worker runners.
- `src/scenarios/`: S0 dataset, independent S0–S5 presets, canonical JSON import/export.
- `src/state/`: draft → run → result, selection, time and local saves.
- `src/scene/`: procedural plant, materials, machinery and lighting.
- `src/scene/crew/`: articulated worker models, obstacle-aware patrols and shared avatar positions.
- `src/scene/navigation/`: Overview/Explore, follow camera, collisions, keyboard and mouse input.
- `src/panels/`: operational panels, SVG charts, timeline, comparison and diagnostics.
- `src/control2d/` and `src/fallback/`: shared-engine 2D interface and standalone build.
- `src/i18n/strings.ts`: central English UI labels. Launcher and current delivery guides are English.

Original Italian specifications (05–07) and the preparation README are retained as historical project
inputs. Private document-library references and local agent settings are excluded from this shared
copy. The current operational guide is this English README.

Diagnostic hooks: `window.__BEERAI__` exposes state, camera and staff poses;
`window.render_game_to_text()` describes the spatial scene for automated verification.

## Model limits and assets

Deterministic planning heuristic, unlimited abstract pre-packaging buffer, 100% yield, no waste,
raw-material constraints, staff constraints, transport time, costs or installation time. Brewing
and transfers are instantaneous; fermentation and maturation share one residence period. The layout
is illustrative. Full assumptions are available in the **Model assumptions** panel.

Tank level equals volume/capacity; it does not fall during fermentation. Pipe pulses, bottles,
trucks and walking staff are illustrative visual elements. No live sensors are connected.

All models, including avatars, are generated locally. Poppins and Roboto Mono are bundled via
Fontsource under the SIL Open Font License. React, Three.js, R3F, Drei and Zustand use MIT licences.

## Webinar sharing copy

This repository includes editable source, tests, the compiled 3D application, a standalone 2D
fallback, synthetic scenarios, and the operating guide. Download the release ZIP and extract it
before launching. Scenario edits saved in the presenter's browser are local and are not part
of this package; the supplied reference scenarios are S0–S5.

## Screenshots

[Browse all 36 test and tour screenshots](test-results/README.md). Only PNG captures are shared; local logs and JSON test reports are excluded.
