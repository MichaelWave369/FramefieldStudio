# Character Motion Studio — Phase 1D (draft)

## Purpose
Build **repeatable character posing and shot references** on top of the
read-only Character Asset Lab introduced in Phase 1C.

This is a small, local-first milestone for Larrina's eventual ChipToons
production workflow, not a standalone rig editor and not a direct integration.

## Features

- Select an existing embedded GLB animation clip.
- Choose **24 or 30 FPS** preview sampling and move the playhead to a
  particular frame, including the fractional-duration final frame.
- Pause-and-scrub, first/previous/next/last frame navigation.
- Optional loop while playing at real time.
- Download the currently posed character as a **PNG still**, with
  model/clip/frame/fps in the filename.
- Preserve the current scene JSON version, the existing editable static GLB
  importer, undo/redo, GPU Preview, BPC XR export and no-login operation.

## Technical design

`src/characterTimeline.js` provides pure frame-time conversions independent
of Framefield's project editing timeline. The GLTFLoader + Three.js mixer
samples a selected source animation at a deterministic time; the viewer uses
animation playhead seconds, not accumulated Euler/frame increments, to evaluate
a paused pose. Browser-local PNG export uses a WebGL drawing buffer configured
for capture while the Character Lab is open.

Clip source durations are capped at 300 seconds; inputs are constrained to
existing 24/30 FPS values. Resampling changes the preview time grid, **not**
the character's animation playback speed or the Framefield project FPS.

## Acceptance gates

- `npm test` checks timeline rounding, clipping, loop vs stop, and invalid
  numeric inputs.
- Chromium WebGL test scrubs the self-contained original GLB to frames 0 and
  12 at 24 FPS and verifies different images.
- Switching to 30 FPS preserves the same approximate clip time and updates
  the frame readout to 15, with last/previous controls tested.
- Capture a real local PNG from the paused character scene; verify PNG magic
  bytes and the requested frame/fps naming scheme.
- All existing Canvas2D, Character Lab, Firefox and WebKit browser regression
  suites remain green; CI uploads retained PNG frame evidence.
- Visually inspect the screenshots, test with real fully rigged assets, check
  memory/canvas capture in Safari and on low-end devices.
- No automatic merge or deployment.

## Limits

- This is **read-only posing of source clips**, not hand-authored motion,
  IK, facial morph editing, lip-sync, a rigging package or a shot camera editor.
- PNGs are reference stills only, not a deterministic production sequence:
  camera movement and browser GPU differences may affect pixels.
- The Character Lab playhead is isolated from the main editor timeline.
- No GLB editing, persisted scene asset references, ChipToons adapter,
  character-to-character acting, multi-shot render, or XR compatibility claim.

Next: versioned character data/asset references with explicit migration,
facial expressions and named reusable poses, then the two-character workshop
handoff demo. Preserve creators' assets and all relevant third-party licenses.
