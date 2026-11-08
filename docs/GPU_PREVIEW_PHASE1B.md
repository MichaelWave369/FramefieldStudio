# GPU Preview Phase 1B — Browser and recovery evidence

**Scope:** improve the opt-in GPU preview's reliability only. The editor remains
Canvas2D by default; project JSON and BPC XR wire contracts do not change.

## Changes

- Report completion of first GPU draw and expose a non-persistent
  `data-rendered-frame` marker for browser acceptance.
- Rebind the software editor's mouse-wheel camera control when returning from
  the GPU preview. Existing controls must not become dead after switching modes.
- Handle the `webglcontextlost` event with a clear status and automatic
  return to Canvas2D. This is recovery to the existing editor, not an automatic
  GPU context restoration.
- Simulate disabled WebGL in the ordinary browser test suite, confirming
  fallback, software pixel output, wheel camera behavior, editing and scene JSON.
- Run a dedicated Chromium + SwiftShader WebGL suite in CI. Capture PNG
  screenshots of actual rendered frame 0 and frame 60; assert they differ.
  Verify one return to the editor with Undo and zoom and a synthetic context loss
  followed by re-entry.
- Upload screenshots/test evidence as CI artifacts. Check images visually before
  release or claims of visual parity.

## Manual gates still necessary

- Check GPU frame 0/60 screenshots are actually correct, not merely different.
- Compare Canvas2D and GPU positions, rotation, framing and lit colors across
  demo assets, especially mirrored and subdivided geometry.
- Check real hardware GPU context loss, resize, high-DPI screens, low-end PCs,
  memory use and Firefox/WebKit GPU support.
- Repeated fast switching and saved shot/PNG sequence exports should not alter
  project data or crash the software editor.
- Test imported GLB assets as the existing **static flat-color** subset only.

## Non-goals

No skeletal animation, morphs, facial acting, object-to-object IK, textured
rigged glTF, XR handoff, or public ChipToons production claim in this PR.

The GPU suite uses Chromium software WebGL only to make **real WebGL rendering**
runnable in a headless CI environment. It does not validate physical GPU speed,
Quest 3 readiness, or all platform configurations. No automatic merge or deploy.
