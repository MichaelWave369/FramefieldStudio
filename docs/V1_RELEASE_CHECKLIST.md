# Framefield Studio v1.0 Candidate Acceptance Checklist

Framefield is an independently implemented MIT browser-based 3D animation
studio, not an equivalent replacement for Blender. Do not tag v1.0 stable
until all automated checks and this manual walkthrough have passed.

## Build and integrity

- [ ] Run `npm ci`, `npm test`, `npm run build` on clean checkout.
- [ ] Run Playwright Chromium suite on the built GitHub Pages path.
- [ ] Verify the GitHub Pages deployment loads React with no console errors.
- [ ] Inspect source, dependencies and assets for MIT/license compatibility.
- [ ] Confirm no remote telemetry, credentials, proprietary sample media.

## Creator workflow

- [ ] New project, rename, create/copy/delete objects and Undo/Redo.
- [ ] Load all four starter scenes; verify animation and their camera settings.
- [ ] Change a name or material, observe local save success, refresh and recover.
- [ ] Refresh with a draft, discard it, refresh again, confirm no recovery prompt.
- [ ] Test corrupt draft backup and recoverable storage-quota errors.
- [ ] Download JSON and reopen after reload or in another supported browser.
- [ ] Test offline editing only after initial asset load; note GitHub Pages has
      no guaranteed service worker cache in this milestone.

## Editing and rendering

- [ ] Click rendered object surfaces, move/rotate/scale gizmos, inspect focus.
- [ ] Mesh conversion; vertex, edge, face editing; extrude/inset/bevel; Undo.
- [ ] Subdivision and mirror modify preview but not source geometry.
- [ ] Graph editor and easing produce smooth, frame-accurate animation.
- [ ] Ambient/key/fill lighting affect a clean PNG at multiple resolutions.
- [ ] Shot camera remains independent from editor camera.
- [ ] PNG ZIP sequence contains frame-accurate numbered images.
- [ ] Stop WebM recording and verify playable result on target browsers.

## Document known boundaries

- [ ] Canvas2D software preview, no PBR, depth buffer or cast shadows.
- [ ] Complex meshes have conservative budgets and may render slowly.
- [ ] Autosave is browser-local, not cloud sync, and can be evicted.
- [ ] No rigging, UV unwrapping, general import/export formats, sculpting, or MP4.
- [ ] Apply a version tag only after manual usability review and a clean release.
