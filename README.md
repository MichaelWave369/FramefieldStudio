# Framefield Studio

An **original, MIT-licensed React/Vite browser 3D keyframe animation editor**. Working title. This is an independent project inspired by familiar animation-editor workflows, not a fork of Blender and not affiliated with it.

## Features in this React alpha

- Fully interactive 3D canvas with original, dependency-free software perspective mesh renderer
- Orbit, pan, zoom, grid and XYZ axes, object picking
- Create cube, sphere, pyramid, cylinder and torus
- Outliner: select, rename, duplicate, hide/show and delete
- Object transforms, colors, interpolation between keyframes
- Timeline playback at 12/24/30/60 FPS, frame scrubbing, keyframe navigation
- JSON project save/load (locally), PNG snapshots and browser-supported real-time WebM recording
- No account, analytics, remote project upload or database

**Renderer note:** This React port uses a Canvas2D software 3D renderer. The earlier standalone proof-of-concept had a WebGL2 path. A future improvement can migrate GPU rendering behind the same pure scene model. This is not Blender feature parity: no polygon editing, sculpting, UVs, rigging or GPU ray tracing yet.

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

The public URL is a **target**, not a claim that a deployment has already succeeded.

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

## Roadmap

- Vertex/edge/face mesh editing, finer object picking and manipulators
- Better viewport picking, GPU/WebGL2 rendering, physically based shading and cast shadows
- Animation track grouping, graph zoom/pan, keyframe retiming and overshoot tangents
- Model import/export via independently written serializers
- Bone/rig animation, camera animation, offline movie/video encoding
- Optional desktop packaging

## Licensing

All application source is released under [MIT](LICENSE). React and Vite are external build/runtime dependencies with their own compatible licenses; preserve their notices when distributing bundled dependencies. No GPL Blender implementation or assets are copied.
