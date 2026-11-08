# Framefield GPU Preview — Phase 1A (review candidate)

## What this PR does

Adds an explicitly opt-in, **read-only** Three.js WebGL preview of existing
Framefield scene primitives and editable polygon meshes. It evaluates the same
scene transform keyframes and non-destructive modifiers used by Canvas2D,
with the current ambient/key/fill lighting and roughness/metalness/emission
settings translated to GPU materials. GPU canvas resources are disposed on exit.

The original Canvas2D editor remains the **default** and owns object selection,
handles, mesh edits, picking, undo/redo, snapshots, PNG sequence export and
WebM recording. Source files, JSON project format, and BPC XR contract are unchanged.
WebGL failure returns the user to Software View with an explicit status.
No login, remote textures, uploaded data, new telemetry, or publishing.

## Intentionally unsupported

- GPU preview is not an editable viewport, production renderer or export backend.
- Imported GLB remains the existing restricted static, flat-color subset;
  no UVs, textures, skins, rigged characters, morphs or glTF animation yet.
- No camera depth-of-field, HDR environment maps, artistic lighting rigs,
  timeline acting/lip sync, or shot-aspect letterbox parity yet.
- Polygon fans are suitable for Framefield's convex authoring meshes, not
  a robust triangulator for arbitrary concave imported polygons.
- GPU material appearance is not expected to match Canvas2D byte-for-byte.
- Shadows are enabled between scene meshes; without authored receiving surfaces,
  they can be subtle or invisible. There is no automatic ground-plane insertion.

## Verification before ready-for-review

1. Run `npm install`, `npm test`, `npm run build`, `npm run audit:dist`.
2. Run Chromium Playwright including existing editor interactions and PNG export.
3. Run Firefox and WebKit compatibility suites; software default must still work.
4. In a hardware-accelerated desktop browser, toggle **GPU Preview**, capture
   an actual rendered screenshot, and compare lighting, motion, transforms,
   and primitive placement to **Software View**.
5. Verify toggling back restores gizmos, selection and mesh editing.
6. Disable WebGL or deny context creation: toggle must return to software with
   a useful message and leave project JSON unchanged.
7. Measure startup, toggle time, draw time, GPU memory/context lifetime, and
   responsiveness on a low-power target before enabling any GPU default.
8. Test context loss and repeated enter/exit cycles for leaks.

CI passing alone is **not** proof of GPU visual fidelity, real-device
compatibility, or release readiness. This is a draft milestone.

## Integration boundaries

Future revisions can replace the read-only preview with an independently
tested editor-renderer interface; do not swap the Canvas2D export path without
pixel-level acceptance tests and explicit migration. The existing BPC XR
packet remains unchanged. GLB import/export upgrades and ChipToons integration
need separate versioned adapters and real receiving-app tests.

Three.js is MIT licensed. Keep its distribution notices and any future
third-party attribution with production bundles.
