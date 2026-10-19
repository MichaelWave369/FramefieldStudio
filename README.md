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

## Roadmap

- Vertex/edge/face mesh editing, finer object picking and manipulators
- Better viewport picking, GPU/WebGL2 rendering and material lighting
- Animation track grouping, graph zoom/pan, keyframe retiming and overshoot tangents
- Model import/export via independently written serializers
- Bone/rig animation, camera shots, offline frame-accurate export
- Optional desktop packaging

## Licensing

All application source is released under [MIT](LICENSE). React and Vite are external build/runtime dependencies with their own compatible licenses; preserve their notices when distributing bundled dependencies. No GPL Blender implementation or assets are copied.
