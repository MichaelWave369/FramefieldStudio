# Framefield Studio

An **original, MIT-licensed React/Vite browser 3D keyframe animation editor**. Working title. This is an independent project inspired by familiar animation-editor workflows, not a fork of Blender and not affiliated with it.

**Status:** v1.0 candidate. The release is not tagged stable until the
[release checklist](docs/V1_RELEASE_CHECKLIST.md) and manual review pass.

**New creator?** Open **Quick Start** in the studio or read the
[Creator User Manual](docs/USER_MANUAL.md). Use **Starter Scenes** to try one
of four projects or download a portable example JSON without affecting your work.

## Current features (release candidate)

- Fully interactive 3D canvas with original, dependency-free software perspective mesh renderer
- Orbit, pan, zoom, grid and XYZ axes, object picking
- Create cube, sphere, pyramid, cylinder and torus
- Outliner: select, rename, duplicate, hide/show and delete
- Object transforms, colors, interpolation between keyframes
- Timeline playback at 12/24/30/60 FPS, frame scrubbing, keyframe navigation
- JSON project save/load (locally), PNG snapshots and browser-supported real-time WebM recording
- Original starter scenes, in-app guided tour, downloadable example JSON, and explicit local autosave recovery
- No account, analytics, remote project upload or database
- Guarded local static GLB import with SHA-256 review, undoable scene insertion and approximate flat glTF material color (not texture/PBR support; see [limits and acceptance](docs/GLB_LOCAL_IMPORT_V01.md))

**Renderer note:** This React port uses a Canvas2D software 3D renderer. The earlier standalone proof-of-concept had a WebGL2 path. A future improvement can migrate GPU rendering behind the same pure scene model. This is not Blender feature parity: geometry editing is limited, and there is no sculpting, UVs, rigging or GPU ray tracing yet.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev
npm run test
npm run build
npx playwright install chromium
npx playwright test
```

The development server reports its local address, normally http://localhost:5173.

## GitHub Pages

GitHub Actions workflow `.github/workflows/pages.yml` builds and deploys `dist/` when `main` changes. The Vite base path is `/FramefieldStudio/`.

After merging the PR:

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Open **Actions** and verify the `Deploy GitHub Pages` run.
3. Visit https://michaelwave369.github.io/FramefieldStudio/

GitHub Actions has successfully deployed the current v1.0 candidate on `main`;
the deployed site's **exact revision** can be checked using
`/FramefieldStudio/release-info.json` after this pull request merges.
A successful deployment does not mean the manual v1.0 release checks are complete.

## Project format

Save JSON from the toolbar. Nothing is automatically uploaded or saved remotely. Projects are validated at import, with a maximum of 100 shapes, up to 600 keyframes per object and frames 0–600.

## Viewport movement and undo/redo (v0.2)

- In **Move** mode (keyboard `G`), select an object and drag an X (red), Y (green), or Z (blue) axis handle in the viewport.
- Hold **Alt** while dragging to snap world motion to 0.25-unit increments.
- Choose **Orbit** (keyboard `O`) to temporarily hide move handles; left-drag orbits as usual in either tool.
- **Undo**: Ctrl+Z or Cmd+Z. **Redo**: Ctrl+Shift+Z/Cmd+Shift+Z (also Ctrl+Y).
- Each complete gizmo drag is exactly one undo step. History is in-memory and capped to 70 edits; it is not part of exported JSON projects.
- Changing object properties, adding keyframes, and importing projects are also undoable.

## Rotate and scale tools (v0.3)

- Select **Rotate** (keyboard `R`) to show three colored world-axis rotation rings, then drag a ring. Hold **Alt** to snap angles to 15°.
- Select **Scale** (keyboard `S`) to show square-ended axis handles. Drag to resize the selected axis. Hold **Alt** for increments of 0.1.
- Scale preserves the original sign for mirrored axes and clamps magnitude to avoid zero-sized or explosive shapes.
- All gizmo edits create/update transform keyframes at the current frame, and each completed drag is one Undo action.
- World-aligned controls are a first step; local-axis manipulators and custom rotation ordering are future work.

## Graph Editor and easing curves (v0.4)

Switch from **Dope Sheet** to **Graph Editor** in the animation timeline. Choose one of nine independent channels (Position/Rotation/Scale × X/Y/Z), then:
- Drag **keyframe dots vertically** to edit the chosen transform value at its existing frame.
- Choose the outgoing segment and set **Linear, Smooth, Ease In, Ease Out, or Hold** interpolation.
- Drag the two golden cubic Bezier handles for custom easing within each selected segment. Frames stay fixed in this version.
- Changes update the same scene keyframes rendered in the 3D viewport and are undoable, with a continuous drag stored as a single undo step.
- Save/open JSON includes a small optional `curves` map on source keyframes. v0.1–v0.3 projects with no `curves` continue to play **linear** by default.
- Bezier control points stay within 0–1 on both axes to avoid unwanted overshoot; true overshoot and independent key time retiming are future work.

## Materials & Lighting Studio (v0.5)

Use the right inspector's **Object** tab to edit surface color, pick Matte/Satin/Gloss/Metal presets, or directly adjust Roughness, Metalness and Emission.
Use **Lighting** to control ambient strength and two colored, directional lights (Key and Fill). Both lights have enable toggles, intensity, color, and world-direction vectors.
- Preview lighting is computed by our own dependency-free per-polygon Canvas2D shader, approximating ambient/directional diffuse lighting and simple highlights. **Not physically based rendering** and **not** real reflections, cast shadows, environment maps, or ray tracing.
- The material is stored per object. Lights live on the project scene and apply to all its visible objects.
- All edits are undoable and change the on-screen render immediately, including PNG and browser WebM.
- The JSON format retains existing curves and keyframes; absent `material` and `lighting` fields load with safe defaults. Imports sanitize values, colors and light directions.

## Shot Camera & Render Studio (v0.6)

The **Camera/Render** tab saves a dedicated shot camera independent of the editor's orbit camera. Click **Use Editor View** to copy the current camera into the shot and switch to the clean shot preview, or edit the shot's yaw, pitch, distance and look-at XYZ coordinates. **Shot View** is locked against accidental orbit and previews the exact render aspect ratio, with letterboxing when necessary.

- Choose render dimensions: 640×360, 960×540, 1280×720, 1920×1080, 1080×1080, or 1080×1350. Pick an opaque hex background.
- **Render PNG** creates a clean image of the current frame from the saved shot camera at the selected resolution, *without viewport gizmos, axes, or grid*. Camera framing and render preferences are stored in scene JSON. Legacy projects load safe defaults.
- **Export PNG Sequence ZIP** produces one PNG for each selected frame using the existing animation curves and per-object materials. Configure From, To, and Step. The ZIP is original, standards-compliant uncompressed ZIP32 using CRC32, with no extra runtime dependencies.
- Frame export is intentionally bounded: max 120 frames or fewer at higher output resolutions, with a ~140 MB PNG safety threshold, UI progress and a cancel button. Every export happens locally and synchronously with the active browser session (it does *not* run in the background).
- The existing WebM feature still records the interactive canvas in real time. For a clean camera-view recording, switch to Shot View first. PNG sequence export is independent of playback timing and does not create an MP4.

## Mesh Workshop (v0.7)

In the **Object inspector**, press **Convert to Editable Mesh** to copy a primitive's topology
into the current object's own geometry, then select **Vertex**, **Edge**, or **Face**.
The viewport displays selectable markers, with selected elements highlighted.
Drag a marker with the mouse to change its local geometry, or enter the selected
component's X/Y/Z coordinates numerically. Edge/face edits move their member vertices
together, so neighboring polygons stay connected. **Alt-drag** snaps displacement
to 0.25-unit increments. **Shift-drag** continues to pan the camera.

- Changes are undoable; a complete drag uses one Undo history entry.
- Geometry is stored as `object.geometry = {vertices, faces}` in local project JSON.
- The same geometry is used in animated viewport rendering, shot PNGs and PNG-sequence exports.
- Existing objects without a geometry property use their original primitives. Older
  project files load unchanged. On import, geometry is strictly checked for valid,
  finite vertices and in-range face indices.
- Upper bounds: 800 vertices, 1200 faces, and up to 16 vertices per face.
  Converting an object creates editable topology; this release does not
  support extruding, beveling, deleting vertices, or subdividing.
- **Important**: Mesh edits are local, static deformations. The object's existing
  transform keyframes still animate its edited geometry, but vertex deformation
  is not independently keyframed yet.

## Face Topology Tools (v0.8)

Convert a primitive in **Mesh Workshop**, choose **Face** mode, then select a face
in the viewport or the inspector dropdown. Use the three new original operators:

- **Extrude Face**: create a parallel elevated cap with vertical side walls.
  Enter a positive extrusion height, from 0.01 to 5 local units.
- **Inset Face**: shrink the selected cap toward its centroid and build a flat
  polygon ring around it. Inset ratio is a fraction, from 0.05 to 0.8.
- **Bevel Face**: create a smaller elevated cap and connect it to the original
  boundary with sloping chamfer panels. This is a **single face-border chamfer**,
  not a general edge bevel or a rounded/multi-segment bevel.

The new cap retains the selected face's index. Each operator creates one Undo
step, keeps the original mesh unchanged in history, and respects the
800-vertex/1200-face limits. Mesh JSON validation and all existing material,
animation, camera, PNG and frame-sequence exports use the same resulting geometry.

The first-pass tools work on individual polygon faces. Inset/chamfer tools
require convex boundaries and do not perform topology-aware multi-face inset,
subdivision, sculpting, Boolean cuts, or vertex-level deformation keyframes.

## Non-destructive Subdivision & Mirror Modifier Stack (v0.9)

The Object inspector includes a **Modifier Stack** for each selected object, including
unconverted primitives. Add up to **four** ordered modifiers, toggle any modifier on
or off, adjust its values, reorder with up/down arrows, or remove it. Each change is
undoable.

- **Subdivision** is a 1- or 2-level Catmull–Clark surface smoothing pass with
  shared edge and face points, plus boundary handling. Unlike a simple wireframe
  splitter, the new quad surface becomes smoother.
- **Mirror X/Y/Z** clips to the *positive* side of the specified local-axis plane
  and reflects that half across zero. Shared seam vertices are welded.
  The mirror plane is currently fixed to the local origin; there is no per-axis
  offset or independent clipping threshold.
- **Non-destructive:** source `object.geometry` (or built-in primitive if not yet
  converted) and all keyframes remain unchanged. The evaluated mesh drives the
  standard viewport, lighting/materials, camera PNG, PNG frame sequences and WebM.
  Mesh-editing handles display the **original source cage**, not evaluated vertices.
- Modifiers save as an optional `object.modifiers` array in local JSON. Legacy
  projects without a stack continue unchanged. Import validates modifier values
  and refuses projects whose evaluated topology exceeds the safe preview budget.
- Budget: up to four stack steps, no more than two subdivision levels per step,
  and maximum 7,000 evaluated vertices or 6,000 evaluated faces. Expensive or
  malformed settings are rejected before the scene is committed.
- **Important constraints:** this is a first-pass polygon modifier system rather
  than Blender parity. Subdivision is intended for manifold mesh topology; mirror
  keeps the positive side of its axis, and modifier results cannot yet be baked
  or applied back onto the editable source cage.

## v1.0 Creator Workflow candidate (PR #11)

- **Local autosave:** scene edits are debounced and stored in this browser's
  same-origin localStorage. It saves source geometry, modifiers, materials,
  lights, camera, and keyframes. The app displays **Saving locally** or
  **Saved locally** only after storage confirms success. Browser storage
  can be cleared by the user, can run out of space, and is not a permanent
  substitute for **Save JSON**.
- **Explicit recovery:** if a local draft exists on launch, a dialog offers
  **Restore**, **Download draft backup**, or **Discard**. Nothing is silently
  loaded, replaced, or discarded. A malformed draft can still be downloaded
  as raw bytes for inspection before discarding it.
- **Starter Scenes:** First Motion, Turntable, Bouncing Ball and Product Showcase.
  Every scene is generated locally from original primitives and scene data.
  Choosing one is a normal Undoable editor action.
- **Surface selection:** click visible projected polygons to select the nearest
  object, rather than relying on a fixed distance to an object's origin.
  Existing gizmo drags, camera orbit, and mesh vertex/edge/face picking remain
  separate. Overlapping faces use projected depth to choose the frontmost.
- **Release hygiene:** new regression checks cover reload/recovery/discard,
  starter scenes, surface picking, current editor tools and clean renders.
  See `docs/V1_RELEASE_CHECKLIST.md` for manual acceptance tests and scope
  boundaries.

**Status:** v1.0 *release candidate*, not an announced stable release. All
runtime data remains local; nothing syncs across browsers or devices.

## Creator release kit (PR #12)

- **Quick Start:** a six-step in-app guide linking directly to starter projects,
  object modeling, Graph Editor, lighting, camera/render and JSON backup.
- **Download examples:** each original starter has a separate Download JSON
  button. Downloading never replaces the active scene or touches Undo history.
- **User Manual:** [docs/USER_MANUAL.md](docs/USER_MANUAL.md) explains creating,
  modeling, animating, lighting, rendering, saving, troubleshooting and known
  feature limits. No video or external imagery is needed to use the guide.
- This changes **creator onboarding**, not the rendering engine. The milestone
  stays a release candidate until a human performs manual acceptance testing.

## Scene Vault and safe project replacement (PR #13)

- Use **Scene Vault** in the toolbar to create a manual checkpoint, inspect
  recent checkpoints, **Restore**, **Download JSON**, or **Delete** one with an
  additional confirmation.
- Framefield automatically checkpoints the current scene **before** creating
  a new project, opening valid JSON, or loading a starter. Restoring a previous
  checkpoint protects the current scene first. The last five checkpoints are
  retained; older ones roll off as space is needed.
- The vault uses a single atomic browser-local storage write with an overall
  2.7-million-character cap. No account, upload, telemetry or sync is involved.
- If saving a checkpoint fails (for example a full/disabled storage quota), the
  existing project remains untouched. An explicit warning offers **Download
  current JSON**, **Cancel replacement**, or **Replace anyway**. No false claim
  of successful backup is made.
- These are helpful local recovery points, **not durable cloud backups**:
  clearing site data removes them. Always keep independent JSON downloads.
- The release remains a **v1.0 candidate** until the live browser/manual
  checklist and version tagging have been reviewed.

## v1.0 live release audit (PR #14)

The production build now stamps `dist/release-info.json` with the
full Git commit SHA, package version, build timestamp, Pages base path and
explicit `candidate` phase. `npm run audit:dist` checks the manifest,
MIT license, built HTML and all referenced JavaScript/CSS assets.

**Two separate acceptance gates:**

1. Every PR CI and Pages deployment runs the artifact audit and the existing
   browser regression suite against the *built Vite preview*.
2. **After PR #15 merges**, each successful **Deploy GitHub Pages** run
   automatically triggers **Live v1 Release Acceptance**. It first waits for
   the live CDN to serve that exact commit (maximum three minutes), then
   runs Chromium against the *public URL*. It checks deployed SHA, asset loads,
   console/runtime errors, example JSON import, PNG export and Scene Vault
   recovery, preserving evidence as a workflow artifact.
   Maintainers can still manually trigger it through
   **Actions → Live v1 Release Acceptance → Run workflow** on `main`.
   Stale/malformed deployments fail closed rather than passing against old code.

The [Release Readiness Report](docs/RELEASE_READINESS.md) separates automated
evidence from the remaining **manual** browser and license/UX reviews. No
stable tag is created or implied by this PR.

Commands:

```bash
npm run build
npm run audit:dist
npm run test:live  # targets the actual deployed public Pages site
```

## Automatic post-deploy live acceptance (PR #15)

After a successful GitHub Pages deployment on `main`, the
**Live v1 Release Acceptance** Actions workflow starts automatically. It
checks out the exact deployed commit, waits up to three minutes for public
`release-info.json` to report that revision, and then runs real Chromium
checks against the live URL. A stale, unreachable, or malformed deployment
**fails closed**; only the correct revision is accepted. Failed or skipped
deployments do not trigger a passing audit.

Manual dispatch remains available for targeted audits, and acceptance
evidence is retained as a workflow artifact. This is *automated deployment
verification*, **not** a substitute for manual usability, licensing and
cross-browser reviews before any stable version tag.

## Cross-browser acceptance (PR #16)

Framefield's v1.0 release candidate includes a focused
**Firefox and WebKit** suite, in addition to the full Chromium regression
suite. Pull request checks load the built Pages-path app in both engines and
exercise viewport drawing, onboarding, Scene Vault recovery, editable
mesh/modifier operations, JSON import and actual PNG export.

After deployment, **Live v1 Release Acceptance** runs its existing four
public-site checks in all three engines, against the exact deployed Git SHA.
This uncovers compatibility issues before a stable tag, but it does not
guarantee mobile, touch or WebM codec support. Those require human review.

Run locally:

```bash
npm run build
npx playwright install chromium firefox webkit
npm run test:compat
npm run test:live
```

## Roadmap

- Mesh retopology, advanced manipulators and non-destructive face operations
- Better viewport picking, GPU/WebGL2 rendering, physically based shading and cast shadows
- Animation track grouping, graph zoom/pan, keyframe retiming and overshoot tangents
- Model import/export via independently written serializers
- Bone/rig animation, camera animation, offline movie/video encoding
- Optional desktop packaging

## Licensing

All application source is released under [MIT](LICENSE). React and Vite are external build/runtime dependencies with their own compatible licenses; preserve their notices when distributing bundled dependencies. No GPL Blender implementation or assets are copied.
