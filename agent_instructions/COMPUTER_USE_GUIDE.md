# Brewery Control Room 3D — computer-use operating guide

Version: 12 November 2026. Applies to the English interface with six staff avatars and third-person Explore.

## Purpose and scope

Read this guide before operating the simulator for Luca. Use it as a map of the existing UX/UI,
then adapt the procedures to the user's actual request. This is an operating manual, not a
development guide. Navigation, filming, changing scenario inputs and reading results are carried
out through the visible application. Do not edit the application or manipulate its internal state
to fulfil an ordinary operating request.

The user prefers **Alex**, a **camera behind the avatar**, and a **wide enough view to see the
surroundings**. Preserve those choices unless the user asks for something else. Do not keep
switching avatars or camera modes merely to make navigation easier.

The interface labels in this guide are English. Respond to the user in their language.

## 1. Operating contract

1. Identify the requested outcome: move a person, frame an area, show the process over time,
   change a scenario, compare alternatives, inspect a result, or save/load a configuration.
2. Observe the current page once. Establish the browser, scenario, result status, selected day,
   Play/Pause state, camera mode, controlled avatar and open panel. Do not assume a fresh session.
3. Choose the procedure below. Preserve everything unrelated to the request.
4. Act in short, purposeful steps. After a meaningful action, inspect the updated accessibility
   tree; use a screenshot for spatial movement and camera decisions.
5. Verify the requested visible result before reporting success. A click alone is not evidence.
6. If the user changes the view or operates the browser, refresh the observation and continue
   from that state. Do not replay the old action sequence blindly.

Use the actual computer-use tool available in the session. In this workspace that is
`mcp__cua_repl.js` / the documented `cua` API. Read its current API documentation before using it.
Use visible controls and native input. Do not substitute a hidden browser session, JavaScript
state setters, test hooks, a console command or an automated test for a requested live tour.

Accessibility element numbers and screen coordinates are temporary. Never copy them from this
guide, a prior screenshot or a previous session. Prefer the control's current accessible name,
disambiguated by its section. Re-observe after scrolling or opening a panel.

### Connecting to the visible simulator

- Default URL: `http://127.0.0.1:4173/`. A launcher can choose a later port if 4173 is occupied;
  use the URL it actually prints. The title is **Brewery Control Room 3D**.
- Prefer the user's existing simulator tab. If direct in-app browser access is unavailable,
  use an accessible, dedicated Chrome window for this same local simulator. Chrome Guest mode
  avoids unrelated profiles. Do not inspect chat contents to reach an embedded browser.
- If access is rejected, respect the stated restriction. Use an allowed surface or explain the
  concrete blocker; do not bypass a rejection by another input technology.
- If Chrome offers to translate the page, dismiss the translation prompt. Keep the English UI.
- If the server is stopped and opening the simulator is requested, use **Start_BeerAI.command**
  in the project folder. **Avvia_BeerAI.command** is a compatible shortcut. Opening a URL does
  not start a server. Do not build or install anything to launch the prepared application.
- This guide remains valid when the server is stopped. A successful previous visit does not
  establish that it is still running.

### Native-input patterns

Follow the tool's first-call rules. Obtain the app or browser first; observe the returned state.
Once an app binding and fresh element numbers exist, the following pattern is useful:

```javascript
// Example only: chrome is an existing app binding; exploreIndex comes from the latest tree.
await chrome.click(exploreIndex);
await chrome.getAXStateAndScreenshot();
```

For a short movement followed by visual verification:

```javascript
await chrome.pressKey("w", { durationMs: 500 });
await chrome.getAXStateAndScreenshot();
```

These examples are patterns, not a script to run without checking the current state.
For native macOS scrolling, the supported distance is **pages**, not a `{ pixels: ... }` object.
Use small values such as `1`, targeted at the correct area. Hundreds of pages are not a pixel
distance. Browser APIs in another environment may have different units: read their documentation.

## 2. Where controls live

| Area | Controls and purpose |
|---|---|
| Top bar | S0–S5 presets; scenario name; result freshness; Run simulation; Reset to baseline; Save scenario; Compare scenarios; Export JSON; Import JSON; 2D control room. |
| Left rail: Navigate | Overview / Explore; Capture mouse in Explore; Your avatar selector. |
| Left rail: Guided views | Brewhouse, Fermentation, Packaging, Warehouse, Shipping, Control room; Focus selected. |
| Left rail: Equipment | Control terminal, Brewhouse, Fermenter F1…F8, Empty slot when available, Packaging line, Warehouse, Shipping dock. |
| Left rail: Hall map | Department shortcuts, tank markers, live position/orientation and staff dots. Scroll the rail to reach it. |
| Right drawer | The currently opened operational, comparison, assumptions or diagnostics panel; Close panel button. Its body scrolls independently. |
| Bottom bar | Play/Pause; Day slider; Speed; Timeline; KPI strip; Control panel; Model assumptions; Inspect contents; Labels; Quality; Diagnostics. |
| 3D view | Clickable machinery and people. Drag/orbit/zoom actions must target this area, outside the rail, drawer and bottom bar. |

Two controls can share a label, for example **Warehouse** in Guided views and Equipment.
The guided-view button moves the camera. The Equipment entry opens the panel. Choose by context.
Closing a drawer uses **Close panel**. Pressing Esc does not close that drawer.

## 3. The four states that must not be confused

| State | What changes it | What it means |
|---|---|---|
| Draft inputs | Editing a field, adding/removing an order or tank, loading a saved configuration | A proposed scenario. Editing alone does not update the displayed production results. |
| Computed result | Run simulation; choosing a preset; successful Import JSON | A complete run over the horizon. The freshness badge should say Results up to date. |
| Displayed day | Day slider; Play/Pause and Speed | Which daily plant snapshot is shown. It does not recalculate the scenario. |
| Spatial view | Walking, camera orbit/zoom, avatar choice, guided views | Where you are looking. It does not change orders, capacity, stock or computed KPIs. |

**Run simulation** computes the whole horizon. **Play** advances the displayed day.
To satisfy “start the simulation” during a visual tour, check freshness, run if necessary,
then press **Play** and verify that the day counter advances and the button changes to Pause.
Pressing Run simulation alone does not play the scene. It also does not automatically return
the day slider to zero. Move the slider explicitly if the requested demonstration starts at day 0.

The bottom KPIs summarise the full run. Tank status, stock and Shipments today refer to the
displayed day. In the order table, **By day N** is cumulative to that day; final status, on-time
volume and the shipment list describe the whole computed run. Do not narrate future deliveries
as if they have already occurred at day N.

## 4. Avatars and third-person movement

### Choose and retain the person

| Your avatar option | Role / normal patrol area |
|---|---|
| Alex · Brewer | Brewhouse / fermenter-side aisle |
| Maya · Packaging | Packaging line |
| Sam · Warehouse | Warehouse aisles |
| Jordan · Dispatch | Loading and shipping |
| Taylor · Quality | Fermenter aisles |
| Riley · Engineering | Control-room / central corridors |

Select **Your avatar**, choose the requested person, then press **Explore**. Alternatively,
click a visible person in the scene: that takes control of that person and enters Explore.
Confirm the nameplate **YOU Alex Brewer**, or the requested equivalent, and the blue helmet/ring.
The other staff continue autonomous patrols. The controlled person stays still without input.

Changing the selector while already in Explore transfers control and follows the new person at
their existing position. It does not bring the old person there. Choosing a guided view switches
to Overview, releasing the controlled person to patrol. Avoid that when the user wants Alex to
remain at a particular place. Merely clicking Explore again while already in Explore does not
reset the camera or teleport the person.

### Movement and focus

| Input in Explore | Effect |
|---|---|
| W / Up | Walk forward relative to the current camera direction. |
| S / Down | Walk backward relative to the camera. |
| A / Left | Strafe left relative to the camera. |
| D / Right | Strafe right relative to the camera. |
| Shift + movement | Run. Use only in a clear aisle. |
| Q / E | Orbit camera left / right; does not move the person's feet. |
| Drag on the 3D view | Orbit horizontally and change camera elevation. |
| Wheel over the 3D view | Zoom in/out; scroll down to increase follow distance. |
| Capture mouse | Explicit continuous mouse orbit; Esc releases capture. |
| Esc | Also releases a focused field/select, restoring movement keys. |

While a text field, number field, range slider or selector is focused, movement keys do not
drive the avatar. After editing, use Esc and verify focus before walking. Do not click an arbitrary
3D object merely to focus the view: it may open equipment or take control of another person.

Walk at first in 300–800 ms bursts, then inspect a screenshot. In a long, verified clear aisle,
1–2 second bursts are reasonable. Walking is nominally 3.2 metres/second and running 6, but do
not infer the exact destination from held-key duration. Collisions, frame rate and user actions
can change the result. Stop, check the map and reorient if movement is blocked.

**The keys are camera-relative, not map-relative.** After orbiting, A no longer necessarily
means west. Establish the red map arrow's direction before choosing the next movement key.
The body turns toward movement, while the camera retains its orbit direction. After A/D or S,
the camera may be beside or in front of the body. A short, safe W step aligns the person with
the camera's forward direction, restoring the desired view from behind.

### A readable follow camera

1. Keep the requested avatar and Explore mode.
2. Move into a clear aisle. Leave space behind the avatar as well as ahead.
3. Scroll down over the **3D view**, one small action at a time. Verify that the person becomes
   smaller and more of the surroundings are visible. Scrolling over a drawer scrolls the drawer.
4. Adjust horizontal orbit with short Q/E presses or a modest drag. A 180-degree turn is about
   1.85 seconds at nominal speed; use smaller increments and observe rather than treating this
   as a guaranteed timing command.
5. Use a small vertical drag for a moderate downward view. Avoid a top-down view of the helmet.
6. Check the final frame includes the avatar and the requested equipment, racks or bay.

Follow distance is limited to approximately 2.5–9 metres. The camera shortens its boom when
a wall, tank, forklift or rack is behind the person; it can also rise. If zooming out still shows
a large helmet, **move clear of the obstruction or orbit toward open floor**, then zoom again.
Continuing to scroll cannot force the camera through an obstruction. Do not misdiagnose this
as a zoom-control failure. This occurred beside the warehouse racks and forklift during the tour.

## 5. Plant map and repeatable route planning

Hall map: north is at the top; east is right. North holds production; the bottom-right area is
shipping. The red triangle follows the avatar in Explore and the camera in Overview. Its
direction represents the camera's view direction, not necessarily the body's facing direction.
Small blue dots represent staff; the larger labelled circles are tanks.

The following layout coordinates are navigation references, not values to inject into the app.
Use the map and visible landmarks to reach them with ordinary input.

| Location | Map position / landmarks |
|---|---|
| Brewhouse | Northwest; copper vessels on a raised platform. |
| Fermentation | North-centre; F1–F5 first row, extra tanks may fill a second row. |
| Packaging | Northeast; buffer vessel, conveyor and white/blue machines. |
| Warehouse | East/southeast; blue uprights, orange beams and packaged-stock pallets. |
| Shipping / loading | Southeast, below warehouse; two bay openings, staging lanes and trucks outside on shipping days. |
| Control room | Southwest; glazed walls, desk and terminals. |

Useful free-space waypoints: central aisle around x=8–11; cross south of warehouse racks
around z=11–12; then approach loading around x=16–21, z=12–14. The hall extends approximately
x=-30…30 and z=-18…18, with south at positive z.

Obstacles to anticipate: brewhouse platform; fermenters; conveyor; warehouse rack rows near
z=4.6 and 8.4 across x=13…27.5; forklift near x=14, z=1; control-room glass and desk. The
control-room door is on its east side. The avatar does not jump or climb the platform.

### Move Alex to the loading zone

1. Confirm **YOU Alex** in Explore. Do not substitute Jordan just because he starts near loading.
2. Check Alex's current map position: he may have patrolled since the last visit.
3. Reach the open central aisle west of the warehouse racks, roughly x=8–11.
4. Head south along that aisle until below both rack rows, around z=11–12.
5. Turn east and approach the loading/staging lanes around x=16–21. Leave clearance from the
   bay's pallets and the south wall so the camera retains space.
6. Verify Alex's marker is inside or beside the Shipping rectangle and a bay/staging lane is
   visible. This is arrival; merely pressing the guided Shipping button does not move Alex.

### Turn from loading to look at warehouse stock

Stay in Explore. Orbit the camera toward the racks, then take a short W step only if floor ahead
is clear, so the body faces the warehouse and the camera is behind it. If the south wall now
constrains the camera, stand closer to the northwest edge of the loading area and orbit diagonally.
Keep a wide frame. Use a separate view of the bays if one frame cannot show both warehouse and
trucks clearly; do not repeatedly squeeze the camera between a wall and an avatar.

## 6. Overview, guided views and selecting machinery

**Overview** returns to the full plant view. Drag to orbit, wheel to zoom, right-drag to pan;
WASD/arrows pan across the floor. These controls move the camera, not Alex.

**Guided views** visit Brewhouse, Fermentation, Packaging, Warehouse, Shipping or Control room.
Transitions take approximately 0.75 seconds (instant with reduced-motion preference); allow the
transition to settle before judging the frame. They switch out of Explore.

Click a machine's geometry **or its Equipment-list entry** to open its right-hand panel. The
list is more reliable when machinery is occluded or the user wants a precise tank. Selecting
equipment alone keeps the avatar in place. **Focus selected** frames the selected equipment
and switches to Overview; it is disabled until something is selected.

Hall map department clicks also invoke guided views. Tank clicks open the tank panel. Map clicks
do not issue walk-to commands. Timeline row clicks can select tanks where the overview timeline
offers selection. Do not assume every chart is clickable or that clicking the Gantt changes day.

## 7. Scenario changes and time playback

### Choosing S0–S5

Click the corresponding top-bar preset. Each replaces the draft with an independent scenario
and runs it automatically. Verify the scenario name and **Results up to date** badge. A preset
does not necessarily reset the day, pause playback or change the avatar/camera.

| Preset | Independent starting point / change | Service volume | Complete on time | On time / demand |
|---|---|---:|---:|---:|
| S0 | Existing commitments | 100.00% | 7/7 | 155 / 155 hL |
| S1 | S0 + Festival O08, A, 40 hL, due day 21 | 92.31% | 6/8 | 180 / 195 hL |
| S2 | S1 + packaging 60 instead of 30 hL/day | 92.31% | 6/8 | 180 / 195 hL |
| S3 | S1 + empty F5, 20 hL, available from day 0 | 97.44% | 7/8 | 190 / 195 hL |
| S4 | S0 existing order quantities ×1.30; no Festival | 83.13% | 5/7 | 167.5 / 201.5 hL |
| S5 | S0 with F4 unavailable [0,21); no Festival | 93.55% | 5/7 | 145 / 155 hL |

These are reference checks, not numbers to claim without reading the actual result. Edited/imported
scenarios may differ. Final backlog is zero in these six reference runs; zero backlog does not
mean every delivery was on time. F5 is physically present in S3; it disappears when returning to S0.

### Editing inputs and applying them

1. Open the right equipment panel and scroll to **Inputs (new scenario, recomputed from day 0)**.
2. Edit the relevant field by replacing its entire value. Numeric decimals use a point.
3. Verify the entered value and leave the field with Enter or a deliberate click. Invalid local
   numeric text can revert on blur; an unchanged result does not prove the new number was accepted.
4. For add/remove operations, press the relevant action button after filling the fields.
5. Check for **Results not up to date**, press **Run simulation**, and wait for **Results up to date**.
6. Verify both the simulated input and resulting KPI/table/snapshot. The previous result remains
   visible if a run is rejected; do not describe it as a successful new run.

All edits describe a counterfactual starting at day 0, even if the day slider currently says 21.
They are not physical changes applied midway through that run. Save/export the current draft
before replacing it if the user needs to preserve it.

### Play, pause, speed and exact day

- **Play** changes to **Pause** and advances one simulated day per tick. **Speed** offers
  `0.5× (0.5 day/s)`, `1× (1 day/s)`, `2× (2 day/s)`, `4× (4 day/s)`.
- Use 0.5× or 1× for a narrated tour. Faster playback can skip past an interesting shipment
  while the agent is reading the UI.
- **Pause** before selecting an exact day. Use the Day slider, verify its day text, and inspect
  the scene/panel at that day. If the tool cannot set a range value directly, focus the slider,
  use Home/End and arrow increments, and verify. Arrow keys in that focused range do not walk Alex.
- Esc leaves the range before walking. Do not use Reset merely to set day 0.
- Playback stops at the horizon. Pressing Play there restarts from day 0.
- **Reset to baseline** deliberately restores S0 inputs, stops playback and sets day 0. It does
  not reset the avatar's location or camera. Use only when a scenario reset is appropriate.

### Show stock and shipping as time passes

1. Choose the requested camera framing and scenario; use the user's existing scenario unless
   they request a different one. Apply any pending inputs with Run simulation.
2. Find shipment dates in **Shipping dock → Shipments today / Orders**. Choose a useful interval
   rather than waiting at a day with no shipments.
3. For an untouched S0 example, start around day 6: O01 ships on day 7. Later due dates include
   10, 14, 21, 28, 35 and 42. Verify the actual run's table after any edit.
4. Show packaged stock before shipment, then the bay on the shipment day. Use 0.5× playback
   or pause on the exact day. Verify the truck/staging pallets, Shipping label and shipped hL.
5. If asked to keep it running, leave Play active; if asked to inspect one moment, pause.

**What the visualisation actually does:** warehouse pallet count represents packaged stock
(approximately 2 hL per pallet, subject to visual slot limits). Shipping staging pallets and up
to two truck representations appear on days with deliveries. A truck has a brief arrival motion.
There is **no continuous animated transfer of individual beer crates onto a truck**, and the
forklift is not user-drivable. Do not claim to be performing either action. You can demonstrate
stock, staging and shipment snapshots and explain their relation to the real order quantities.

## 8. Equipment panels: read and modify

### Fermenter F1…F8

Open its **Fermenter F…** Equipment entry. Read **Snapshot · day N**: status, product, lot,
volume/capacity, start, release, tank-free date and days to release. Initial batches have unknown
pre-day-0 start; a missing time percentage is expected. Fill is volume/capacity and stays constant
during residence; residence-time progress is a separate measure. Empty tanks do not slowly drain.

Scroll for batches in this tank, Gantt and utilisation. Statuses are **Fermenting**, **Cleaning
(CIP)**, **Unavailable**, **Idle**. Turn on **Inspect contents** (bottom bar or panel checkbox)
for x-ray liquid visibility; it changes rendering only.

Inputs: **Capacity (hL)**, **Start day**, **End day (excl.)**, then **Add unavailability**.
Windows are [start,end), so [0,21) ends at the beginning of day 21. **Remove** deletes a particular
window. **Remove this tank** is only offered for tanks without an initial WIP batch. Changing
capacity below an initial batch volume or blocking initial WIP can be invalid. Run and verify.
Changing capacity does not change batch volume or product residence time; those are in Brewhouse.

### Empty slot / add a fermenter

Open **Empty slot (F5)** or the currently offered ID. Set **Capacity (hL)** and click **Add
fermenter F…**. The new tank is first in the draft; press Run simulation to see it in the hall.
No construction or installation timeline is simulated. There are eight visual tank slots maximum.
If no empty-slot entry exists, do not invent a ninth 3D slot. For the preset extra-tank experiment,
use S3 instead of repeatedly adding tanks.

### Brewhouse

The panel shows batches started today, new brews, blocked days, and a table with batch, start
day, tank, product, ready day and triggering order. Scroll to these editable process inputs:

| Input | Unit / accepted UI values |
|---|---|
| Max batches started per day | Non-negative whole number. |
| Batch volume (hL) | Positive hL; minimum 0.001 in the UI. |
| Tank cleaning (days) | Non-negative whole days. |
| Horizon (last day) | Whole day 0–365 in the UI. |
| Beer A (A) — Residence days; Beer B (B) — Residence days | Positive whole days, under Recipes (residence time per product). |

Press Run simulation. More batch starts are still limited by free compatible tanks and uncovered
demand. Do not interpret an unchanged result as a broken field without checking the constraints.

### Packaging line

Edit **Packaging capacity (hL/day)**, then Run simulation. Read the simulated capacity, buffer per
product, packaged-today values, FIFO buffer lots, total packaged and daily chart. Capacity is
shared across products. The abstract buffer has no physical size constraint.

Example: in S1, changing 30 to 60 reproduces S2's experiment. The reference service level stays
92.31%; “double capacity” does not imply “double shipments”. Compare actual results.

### Warehouse

Read finished packaged stock per product, FIFO stock lots and the stock-over-time chart. The
3D boxes are illustrative stock pallets, not a count of individual bottles. Under Inputs, edit
**Initial finished stock (hL) · Beer A** or **… Beer B**, then Run simulation. This changes the
stock at day 0 and reruns the plan; it is not an incoming delivery at the selected day.

### Shipping dock / orders

Read **Shipments today · day N**, customer, volume, on-time/late indicator and source lot IDs.
The Orders table includes quantity, due day, By day N, on-time volume, final status and partial
shipments with FIFO source lots. **Who is late?** filters late/open-late results;
**Show all orders** removes that filter. Moving the day does not change final order status.

For existing orders, scroll to the **Inputs** editable table. Each row has fields identified by
its order ID, for example **O05 customer**, **O05 product**, **O05 quantity hL**, **O05 due day**,
and **Delete O05**. Match the ID before changing or deleting a row.

For a new order, use **Add order (new scenario input)**: Customer, Product, Quantity (hL), Due day,
then **Add order O…**. The ID is generated from existing orders; it is not always O08. Adding
an order with an empty customer yields a generic Customer name. Quantity must be positive and
due day a non-negative whole number. Press Run simulation after adding, editing or deleting.

All quantities are hL. For bottles, obtain the bottle volume or a user-established conversion:
`hL = number of bottles × litres per bottle / 100`. Do not silently assume a bottle size. Orders
beyond the horizon are not counted as due demand within that horizon; extend the horizon only
if requested by the experiment.

### Control terminal / Control panel

Open **Control panel**, **Control terminal** in Equipment, or the bottom KPI strip. The panel
contains scenario/run information, freshness, save/export/import/compare actions, KPIs, mass
balance, Orders with the late filter, Timeline and Event log. Scroll within the drawer.

Key interpretations:

- **Service level (volume)** = volume delivered on time / demand due in the period.
- **Orders complete on time** counts whole orders, not volume.
- **Final backlog** is due demand still undelivered at the horizon, not volume delivered late.
- A mass-balance success confirms quantity conservation; it is not proof that promises were met.
- Historical labels show run duration in milliseconds, not the elapsed production time.

## 9. Timeline, charts, event log and diagnostics

**Timeline** toggles the bottom Gantt drawer; a larger version is in Control panel and a single
tank version in its panel. Product colours distinguish residence periods; hatch patterns show
cleaning and unavailability. The vertical line marks the displayed day. Use the Day slider to
change day. Do not claim a chart click reschedules a batch: drag-to-reschedule is not implemented.

**Event log** is inside Control panel. It has **Event type** (All, Brew, Brew blocked, Release,
Cleaning done, Package, Deliver, Order completed), a search field **Order, lot, tank…**, and
**up to day N**. The search matches IDs including order, triggering order, lot, tank and product;
it is not a general customer-name search. Uncheck the day filter to inspect the full run. Only
the latest 400 matching events are rendered; absence from a long list is not proof of no event.

**Model assumptions** opens the didactic model limits. Use it to explain why an experiment behaves
as it does: deterministic heuristic, finite tank residence, unlimited raw materials and abstract
buffer, 100% yield, no staff or transport constraint, no costs or installation time.

**Diagnostics** exposes run information, current draft Configuration (JSON), computed KPIs and
Events. It is read-only. Configuration can be newer than the displayed result if inputs are stale.
Do not claim a Copy JSON button exists; use **Export JSON** to download the configuration.

**Labels: on/off** changes equipment labels. The active YOU nameplate remains useful. **Quality:
normal/reduced** changes rendering resolution/shadows and leaves numerical results unchanged.
The fps counter describes current rendering, not production rate or a guarantee under screen sharing.

## 10. Save, reload, compare, import/export and restore

- **Save scenario** saves the current draft locally and displays a toast. It assigns a default
  name from the scenario and time; there is no name-entry dialog or rename workflow in this UI.
  Run first if the user expects the save to match a displayed result.
- **Compare scenarios** opens a comparison drawer. Select up to four checkboxes from Current run,
  presets and saved scenarios. Initial comparison is S1/S2/S3. To show a specific pair, explicitly
  remove other selections. A fifth selection drops an earlier one; verify column headings.
- Compare input differences first, then KPIs and per-order outcomes. Current run means the last
  computed result, not an unsimulated draft. Comparisons do not replace the main displayed scenario.
- Expand **Saved scenarios** in that drawer for **Load** or **Delete**. Load restores draft inputs;
  press Run simulation to apply them. Delete removes that local saved entry. No renaming UI exists.
- **Export JSON** downloads the draft configuration, not a video, screenshot, CSV or full event
  report. Verify the download; do not invent its path. It does not export avatar/camera position.
- **Import JSON** opens a native local-file picker. Select the requested file; on macOS the file
  picker can use Cmd+Shift+G for a known folder path. Successful import validates and runs
  automatically. Invalid files show an error and retain the previous displayed result.
- **Restore last session draft** appears in Control panel only when a restorable autosave exists.
  It restores the draft, then needs Run simulation. Browser/profile/Guest storage is local; saved
  scenarios in one browser profile need not exist in another. Export if portability is required.
- Reset and preset changes replace inputs. Do not use them as a camera-recovery shortcut.

## 11. The 2D control room and offline fallback

**2D control room** switches the running app to its 2D interface with the same state/engine.
**Back to 3D brewery** returns. In 2D, Equipment and its editable panel are on the left; KPIs,
Play/day, timeline, Orders and expandable Compare scenarios, Event log, Model assumptions and
Diagnostics are on the right. Use those disclosures rather than expecting the 3D right drawer.
The 2D time card has Play/day but no visible Speed selector; do not invent one.

The standalone `fallback/beerai-control-2d.html` opens directly without WebGL or server. It is a
separate session with the same engine/presets, not a mirror of an unsaved 3D draft. It has no
Back to 3D button. Import an exported JSON if the exact scenario must be carried over.
Avatars, walking and 3D camera controls are unavailable in 2D. Do not describe switching to 2D
as satisfying a request to walk Alex through the building.

If WebGL is lost, the app may switch to 2D after a short delay. While still in 3D, the warning
banner offers **2D control room** and **Try 3D again**. The latter reloads the page; consider
unsaved inputs first. Once in 2D, use **Back to 3D brewery** if available; do not expect a Try 3D
again button inside the 2D warning text. For a slow but working 3D view, **Quality: reduced** is
the first rendering control to try.

## 12. Reusable examples — adapt, do not blindly replay

| User request | UI plan | Completion evidence |
|---|---|---|
| “Walk Alex to loading.” | Verify Alex → Explore → map → clear central aisle → south of racks → loading lanes. | YOU Alex; marker at Shipping; visible bays. |
| “Keep the camera behind him and zoom out.” | Stay in Explore → clear rear obstruction → wheel down over canvas → short orbit/forward correction. | Smaller avatar, visible surroundings, back facing camera. |
| “Look at packaged beer and start time.” | Frame warehouse → apply pending inputs → pick useful pre-shipment day → Speed 0.5× → Play. | Stock visible; Pause button and advancing day. |
| “Show loading on trucks.” | Look at actual delivery table → bay view on delivery day → show staging/truck and order volume. | Shipment/day match; explain snapshot-based visualisation, not individual-crate loading. |
| “Can we take the Festival order?” | S0 baseline if needed → S1 → compare S0/S1 → late orders and source lots. | Read actual service/whole-order change and delivery dates. |
| “Double packaging.” | Packaging line → capacity ×2 from the current accepted value → Run → compare a saved before/after. | Simulated capacity changed; results read even if unchanged. |
| “Add a tank.” | Empty slot → capacity → Add fermenter → Run; use S3 only for that exact preset experiment. | New tank in hall/list and updated results. |
| “Take F4 offline for three weeks.” | F4 → unavailability [0,21) if from day 0 is intended → Add → Run. | Window present and scenario valid; selected-day tank status checked. |
| “Make Beer A faster.” | Brewhouse → Beer A residence days → requested value → Run. | New recipe input and revised release/late-order results. |
| “Who is late?” | Shipping dock or Control panel → Who is late? → inspect order outcomes. | Correct IDs, delays and partial shipment dates. |
| “Trace this shipment.” | Match order ID → read shipment source lots; filter Event log by lot/order. | Lot IDs and quantities agree with the shipment row. |
| “Go back to the beginning.” | If visual replay: Pause → day 0. If scenario reset explicitly requested: Reset to baseline. | Requested time or baseline restored; unrelated inputs preserved when appropriate. |
| “Save this and reopen it later.” | Save scenario and/or Export JSON → verify toast/download → later Load + Run or Import JSON. | Matching inputs and results, not assumed camera persistence. |
| “Stop the demo.” | Pause if requested; release mouse. Stop the local server only if asked. | Correct requested state, not just a closed tab. |

## 13. Recovery table

| Symptom | Action |
|---|---|
| W/A/S/D do nothing | Check app focus, field/select focus and Explore; Esc out of fields; use a short verified movement. |
| Movement goes the wrong map direction | Recheck camera arrow. Orbit changed the camera-relative axes. |
| Avatar will not advance | Inspect obstacles/people; release keys, sidestep into clear floor. Do not keep running at a tank/rack. |
| Helmet fills the frame | Clear rear obstacles; orbit to open floor, then zoom out. Distance may already be at the maximum. |
| Camera is overhead | Check a short collision-constrained boom before changing pitch; move to open floor, then use a small vertical drag. |
| Labels, slider or list have vanished | Scroll the relevant rail/drawer; verify viewport and 3D/2D mode. Do not assume removed functionality. |
| A wheel action scrolls text | Pointer is over a panel, not the 3D canvas; retarget from a fresh screenshot. |
| I clicked Warehouse but no inputs appeared | You likely used Guided views; choose Warehouse in Equipment. |
| Edited field reverts | Invalid/empty local input or blur before accepted change; replace with a valid value and verify. |
| Results look unchanged | Check freshness, successful Run, constraints and actual simulated input. Playback alone does not recompute. |
| No trucks | Check selected day and Shipments today; no delivery means no truck. |
| Stock is empty | Check displayed day and actual stock; already-shipped product is not still warehouse stock. |
| Cannot see all comparison columns | Max four; check the selected checkboxes and horizontal table scroll. |
| Can't find saved scenario | Check browser/profile/session; use exported JSON if available. |
| Tool reports the user changed the app | Refresh UI state before any further input; use the user's latest framing. |
| Local page cannot load | Check the actual launcher URL/server. Opening a tab is not a restart. |

## 14. Ending a session and stopping the local server

When asked to stop the server, do so after completing any requested file/save task. Closing the
tab, pressing Pause or selecting another view does **not** stop it. In the Terminal window that
owns the simulator server, Ctrl+C should print **[BeerAI] Server stopped.**

If infrastructure tools are allowed and no owning Terminal is available, identify the listener
on the simulator's actual port and verify it belongs to this project's local static server before
terminating that process. Do not kill all Node processes or unrelated services. Confirm the port
is no longer listening. Report an actual access blocker if shutdown cannot be completed.

Do not restart the server merely to verify documentation after the user asked to stop it.

## 15. What never to invent

- Live sensors, temperature/pressure readings, working manual valves or a physical brewery link.
- Individual-crate loading animations, a drivable forklift, staff as productive capacity, labour
  shifts, costs, ROI, raw-material purchasing or transport scheduling.
- Jump/climb, click-to-walk, teleporting Alex, a ninth visual tank, drag-to-reschedule charts,
  CSV/video export, editable diagnostics, a rename dialog or a Copy JSON button.
- An unchanged view after an input error as evidence that the action succeeded.
- Real operational facts from synthetic data or an “optimal” plan from a deterministic heuristic.
- A permanent avatar position: staff patrol when released; a refresh starts a new spatial scene.

When a request exceeds the available UX, identify the nearest supported action and clearly state
the difference. A request for a new feature is a separate task; this guide gives no implementation
instructions. Use the guide to know the controls in advance, and current observations to know
their present state.
