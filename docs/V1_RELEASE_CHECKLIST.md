# Framefield Studio v1.0 Candidate Acceptance Checklist

Framefield is an independently implemented MIT browser-based 3D animation
studio, not an equivalent replacement for Blender. Do not tag v1.0 stable
until all automated checks and this manual walkthrough have passed.

## Automated evidence and release provenance

- [ ] PR branch: model tests, built Pages-path browser suite, artifact audit green.
- [ ] After merge: Pages deployment for this exact `main` commit succeeded.
- [ ] Open `https://michaelwave369.github.io/FramefieldStudio/release-info.json`
      and compare `commit` with the deployed GitHub Pages build SHA.
- [ ] After PR #15: confirm **Live v1 Release Acceptance** ran automatically
      after the successful Pages deployment. Check matching deployed SHA and all
      public-site Chromium checks. Manual dispatch remains available.
- [ ] Download and archive the live acceptance evidence artifact.
- [ ] Record SHA, test date, tested browser, and reviewer in
      [RELEASE_READINESS.md](RELEASE_READINESS.md); do not mark unperformed
      checks complete.

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
- [ ] New, Open JSON and starter creation add a Scene Vault checkpoint.
- [ ] Restore and export a vault checkpoint and check source geometry, modifiers,
      animation and lighting survive.
- [ ] Simulate quota denial; scene replacement must stop and offer JSON backup.
- [ ] Explicitly confirm Scene Vault deletion; avoid silent data loss.
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
