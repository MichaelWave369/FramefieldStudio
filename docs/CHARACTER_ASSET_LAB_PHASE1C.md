# Character Asset Lab — Phase 1C (candidate)

## Purpose

The **Character Lab** toolbar button opens an independent local-first
read-only GLB 2.0 preview. It is designed to evaluate potential character assets
before future non-destructive import to Framefield or integration with
Larrina's ChipToons. It intentionally does **not** change Framefield's current
static geometry importer, v1 JSON project format, Undo history, Canvas2D renderer
or BPC XR contract.

## Supported in this rung

- Explicit user-selected **.glb files** only, under 24 MiB. No uploads.
- Local embedded PNG/JPEG textures, glTF PBR material properties,
  rigged/skinned meshes and source animation clips via Three.js GLTFLoader.
- Orbit camera, cinematic key/fill lighting, pause/play a selected clip.
- Read-only metadata for meshes, skins, materials, textures, nodes and source
  animations. Browser-local memory is released when the modal closes.
- Reject external buffer/image URIs, data URIs, unsupported required
  extensions, oversized counts, invalid GLB headers and out-of-range buffer views.
- Asset preview must leave project JSON v1 and the existing editor unchanged.
- Original self-contained skinned, animated, texture-bearing GLB test fixture;
  automated browser checks for animation playback and external URL rejection.

## Limits and next phases

- This is an isolated **preview**, not import/edit/export. The original toolbar
  **Import GLB** still only accepts one small static, flat-color mesh.
- glTF extensions requiring compressed meshes (Draco/meshopt), KTX2 or custom
  loaders are rejected. No arbitrary external resources or HTTP requests.
- Do not treat this as a complete hostile-file sandbox. Use only trusted models,
  and keep CPU/memory/texture limits for future production hardening.
- No facial morph editing, IK, rig authoring, lip-sync editing, full cinematic
  rendering, video export from the lab, verified XR handoff or direct ChipToons
  production interface in this rung.
- Authored cameras, materials and animations are previewed by Three.js;
  no guarantee of Blender, Unity or PixelForge perfect fidelity.
- Materials and textures are not reproduced in the original Canvas2D scene.

## Review gates

1. `npm test`, `npm run build`, `npm run audit:dist`, Chromium, Firefox,
   and WebKit existing suites green.
2. CI GPU Chromium test previews fixture with **embedded PNG, skin, and animation**;
   screenshots of idle and animated views are kept under `gpu-evidence/`.
3. Verify screenshots visually: the model must actually appear, the correct
   skin/texture must be displayed, and the clip moves the intended mesh.
4. Confirm reject-on-external-image test never issues HTTP requests; the project
   remains intact after close.
5. Manually try real rights-cleared textured, multi-mesh, rigged characters and
   several animation clips on the target browsers and hardware. Check memory
   through repeated modal open/close and deliberate WebGL context loss.
6. Check any downstream app's explicit versioned adapter independently.
   Do not claim real ChipToons, Domistika XR, or Quest 3 compatibility yet.

Future Phase 2: define an **editable versioned character scene component**
with preserved glTF source bytes, joint paths, UV/material support, and
animation timeline channels. Upgrade the project format only with tested
migration and rollback. A separate adapter should then hand verified
characters or animation clips to ChipToons and XR, without forcing one codebase.

Three.js and its GLTFLoader/OrbitControls addons are distributed under MIT.
Preserve original and third-party notices.
