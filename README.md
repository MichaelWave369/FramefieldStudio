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

## Roadmap

- Undo/redo, vertex/edge/face mesh editing, draggable transform gizmos
- Better viewport picking, GPU/WebGL2 rendering and material lighting
- Interpolation curves, animation tracks, keyframe moving
- Model import/export via independently written serializers
- Bone/rig animation, camera shots, offline frame-accurate export
- Optional desktop packaging

## Licensing

All application source is released under [MIT](LICENSE). React and Vite are external build/runtime dependencies with their own compatible licenses; preserve their notices when distributing bundled dependencies. No GPL Blender implementation or assets are copied.
