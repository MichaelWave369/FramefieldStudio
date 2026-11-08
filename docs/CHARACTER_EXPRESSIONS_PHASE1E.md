# Framefield Character Acting — Phase 1E

## Scope

Adds **read-only GLB morph-target facial expression sliders** and
**named pose bookmarks** to the Character Asset Lab. The scene editor,
Canvas2D fallback, v1 project format, existing GLB import and BPC XR
contract remain untouched. Work is local-only; no account, uploads,
remote model files, or automatic downstream integrations.

## In this rung

- Discover glTF morph targets exposed by Three.js GLTFLoader, with a
  capped 64-slider budget. Show original target names when available.
  Models with no morphs show an explicit empty state.
- Manual expression weights (0–1) override the sampled source clip during
  preview, so a source animation does not silently erase an authored expression.
  **Reset expressions** restores source animation's original morph weights.
- Capture up to 16 named poses. A pose contains existing clip index,
  exact frame and FPS, and the manually set expression weights.
- Reapply a bookmark in the same session.
- Explicitly download a JSON pose pack and reload it for the **identical
  source GLB**, verified by SHA-256 of its exact bytes. Packs are versioned
  and validated for clip/frame/morph availability. Mismatched sources fail.
- Automated tests cover contract validation, a source GLB fixture with a
  morph target, visual screenshot change, pose restore, pose-pack roundtrip,
  editor preservation and no external resource requirements.

## Limitations

- Facial controls work **only** if the GLB supplies suitable morph targets.
  No synthesized smiles, blendshape creation, autonomous rigging, facial
  recognition, phoneme-based lip-sync, gaze IK or motion authoring.
- Named bookmarks and imported packs are local data only. They do not become
  Framefield v1 scene objects, edited glTF files, or reusable cross-app assets.
- Pose files do not embed model geometry, textures, joint data or movement
  clips. You must have the exact original GLB to restore the pack.
- Pose capture stores clip/frame/FPS and **manual** morph overrides, not
  camera orbit, bone edits, material edits, or shot/lighting settings.
- Review real rights-cleared cartoon rigs in Chrome, Firefox, Safari and on
  low-power devices; shader precision and renderer differences are possible.
- No verified ChipToons, CineSwarm, Domistika XR or PhiOS-XR interface yet.

## Review and acceptance

1. Node tests, build, asset audit, Chromium editor and Firefox/WebKit
   compatibility regression suites must pass.
2. Browser GPU test loads original embedded-asset GLB with named Smile morph;
   changes a slider and verifies a visible pixel difference.
3. Capture named pose, reset expression, recall pose and check matching image.
4. Download, validate and reload source-locked pose pack. Reject invalid
   JSON, mismatched SHA, unavailable target names and oversized packs.
5. Retain screenshot evidence and inspect the model visually.
6. Manually test multiple morph targets and source animation clips, context
   loss, repeated open/close, resource use, and performance.
7. Never auto-merge, deploy, or claim full cinematic character acting.

Next after acceptance: editable expression keyframes, lip-sync/viseme timing,
per-character asset references, and eventual explicit ChipToons handoffs.
