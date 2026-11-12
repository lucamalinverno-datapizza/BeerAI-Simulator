# Verification — English interface and staff avatars

Build date: 2026-11-12 (Europe/Rome). The 2026-11-07 stable copy is preserved.

## Results

- `npm run build`: passed (TypeScript, 3D production build, standalone 2D build, scenario exports).
- `npm test`: 50 tests passed. Includes the existing 45 numerical/store tests and five spatial tests:
  one-minute patrols with all eight tank slots, collision-safe paths, camera-relative movement,
  diagonal-speed normalisation, running into tanks and collision-limited camera boom.
- Production Chrome e2e: 42 passed, zero failed, no console errors and no external requests.
  Browser: local Google Chrome 157.0.8103.52, headless WebGL. Browser plugin not available;
  used the installed playwright-core with local Chrome.
- Visual review: 1440x900 and 1024x768; production e2e also renders 1920x1080. Title, English
  document language, meaningful UI, absence of framework overlays and clean console verified.
  No horizontal document overflow at 1024x768.

## Behaviours exercised

- Six staff patrol independently while engine KPIs stay unchanged.
- Explore controls a visible staff member from behind; actor stays on the floor and outside equipment.
- Avatar selector transfers control and releases the previous staff member to resume patrol.
- Clicking a visible person enters third-person control of that person.
- WASD/arrows, Shift running, Q/E orbit, mouse-drag orbit and wheel zoom.
- Camera boom shortens before walls and machinery.
- Typed text and selector keys do not move the controlled avatar; Esc releases field focus.
- Guided views, machine selection via geometry/list, Focus selected and reduced quality.
- S0–S5 KPIs, real packaging-capacity edit, F5 appearing/removal, run supersession, playback,
  import/export/reset, saved scenarios, comparison and late-order inspection.
- In-app 2D switching, standalone fallback opened from file:// with identical S0–S5 KPIs,
  no localStorage, automatic 2D fallback without WebGL and local-only network requests.
- The game skill's action client ran two movement sequences, with state dumps and screenshots
  visually inspected. A temporary adapter used existing playwright-core and local Chrome.
- Source audit: runtime labels, launcher messages and current operational guides are English.
  Original Italian project briefs remain historical inputs.

## Evidence and reproduction

The stable package includes `verifica/e2e-report.json` from this production-build run.
Reproduce with `npm test`, `npm run build` and `npm run test:e2e`.
The spatial text hook is `window.render_game_to_text()`; diagnostic positions are exposed in
`window.__BEERAI__.crewPoses` alongside camera pose and engine state.

## Practical limits

Staff are illustrative and do not create labour constraints in the engine. No new external
assets or runtime services were added. Performance during Teams screen sharing, the physical
Wi-Fi-off test, Safari, trackpad feel and live voice/agent operation were not tested in this update.
The pointer-capture button and default unlocked state were checked; physical Esc release of
native pointer lock remains a manual check. Headless frame rates do not establish Teams performance.
