# Guarded local GLB import — geometry-only first increment

**Status:** integration candidate, not general glTF compatibility or release qualification.

This feature extends the original GLB parser with **Import GLB** in the Framefield toolbar.
Only `.glb` files selected by the user are read. The browser computes SHA-256 over the
original bytes; the editor displays the original filename, digest, topology counts, and
unsupported-feature disclosure before **Add mesh to scene** is available.

Nothing is uploaded or inserted before the explicit second confirmation. **Cancel** preserves
the scene unchanged. Confirm creates one undoable object using the existing Framefield editable
geometry shape and keyframed object transforms. Project JSON save/open retains
`glbSource.fileName` and `glbSource.sha256`, tagged clearly as evidence of **original file bytes**,
not of subsequent geometry edits.

## Supported subset

- GLB 2.0 with one embedded binary buffer, one mesh and one triangle primitive
- Float32 VEC3 positions and absent or unsigned integer triangle indices
- Up to 16 MiB of source bytes, 800 vertices, 1,200 triangle faces
- An editable static mesh and Framefield-native position/rotation/scale keyframes
- Local project JSON save/open and undo/redo

## Rejected / not preserved

- Multiple meshes or primitives, lines/points, material-bound primitives
- PBR materials, textures, UVs, normals, authored glTF animations, skeletal rigging, morph targets
- Node translation, rotation, scale, and matrices (reject instead of silently losing transforms)
- Sparse accessors, interleaved buffer views, missing/out-of-range indices, invalid geometry
- Over-budget meshes and invalid or zero-area triangles

The current Canvas2D renderer is not a photorealistic or full glTF renderer. This is **not**
verified compatibility with arbitrary PixelForge outputs, Fab assets, UE-exported material
stacks, or Quest 3 performance.

## Small manual acceptance

1. Save current Framefield project JSON, then open **Import GLB**.
2. Select a small, rights-cleared geometry-only GLB. Confirm the SHA-256 fingerprint, name,
   triangle count, and limitations shown in the review dialog.
3. Cancel and verify the scene is unchanged. Reopen and choose **Add mesh to scene**.
4. Verify the mesh is visible, independently selectable, editable, and transform-keyframe
   animatable. Undo and Redo the import.
5. Save project JSON, reload, verify `glbSource` retains the original source digest.
6. Test a malformed GLB, materials-bearing GLB, transformed-node GLB, and oversized file:
   errors must be surfaced without changing the scene.
7. Export **BPC XR** and load into Domistika only when within its additional device
   budgets. Physical Quest 3 validation is a separate acceptance gate.

## Rights and provenance

Original bytes remain local. SHA-256 verifies byte identity only. It does **not** assert
copyright ownership, Fab resale/redistribution permission, clean topology, or production
quality. Review the license for each purchased UE/Fab asset before publishing source meshes,
derivatives or reusable model files.

This feature does not alter the existing BPC XR schema, deploy physical devices,
create an installed PhiOS app, or authorize a public release.
