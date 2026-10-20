# Framefield Studio — Creator User Manual

**Release status:** v1.0 candidate, not a stable version tag.  
**License:** MIT. Original, independently developed source.  
**Web studio:** https://michaelwave369.github.io/FramefieldStudio/  
**Source:** https://github.com/MichaelWave369/FramefieldStudio

Framefield is a local-first 3D modeling and keyframe animation tool that runs in
your browser. Its perspective renderer is based on Canvas2D, not a GPU engine.
No account, cloud project database, downloaded art packages, or subscription
is required to use the editor. Internet may be required to load the website
assets when you first visit.

## 1. Start a project in two minutes

1. Open the studio and choose **Quick Start** in the top toolbar.
2. Follow the six short steps: Create, Model, Animate, Light, Render, Keep.
   Each step has a button that jumps into that part of the editor.
3. Open **Starter Scenes** and choose one:
   - **First Motion:** original cube orbit and floating sphere.
   - **Turntable:** rotating sculpture and display stand, with subdivision.
   - **Bouncing Ball:** editable ball motion, squash keyframe, and easing curves.
   - **Product Showcase:** animated beacon, pedestal, tinted lighting and camera.
4. Press **Space** to play. Click the timeline ruler to scrub.
5. Choose **Save JSON** to download the project to your device.

**Want just the project file?** In Starter Scenes, click **Download JSON**
beside any sample. The current scene and Undo/Redo history are not changed.
That file can be opened in Framefield later using **Open JSON**.

## 2. Understand the workspace

- **Top bar:** project name, New, Starter Scenes, Quick Start, Open JSON, Save JSON,
  Render PNG, Record WebM, Undo and Redo.
- **Left panel:** Scene Collection. Add, select, duplicate, hide, rename,
  or delete objects. Key viewport shortcuts appear below.
- **Center:** Perspective viewport with object controls, camera movement, and
  optional saved **Shot View**.
- **Right:** Object Inspector, Lighting, and Camera/Render tabs.
- **Bottom:** animation timeline or Graph Editor.

The **scene collection** and viewport both select scene objects. Clicking a
visible polygon surface selects the closest projected surface, not merely
the object's center marker. In Mesh Edit mode, viewport points/lines/faces
instead select components of the source cage.

## 3. Model an object

Choose a shape from the left panel (Cube, Sphere, Pyramid, Cylinder, or Torus).
Select it in the outliner or viewport. The Object Inspector exposes:

- Position, rotation (degrees), and scale fields. Current-frame edits create
  or update transform keyframes.
- Material color, roughness, metalness, and emission.
- Mesh Workshop and non-destructive modifier stack.

**Viewport tools**

| Action | Control |
|---|---|
| Orbit the editor camera | Left-drag viewport background |
| Pan camera | Shift + drag |
| Zoom | Mouse wheel |
| Move selected object | G, then drag colored axis |
| Rotate | R, then drag colored ring |
| Scale | S, then drag colored axis |
| Orbit tool | O |
| Snap transformations | Alt during a drag |
| Undo / redo | Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (Ctrl+Y also works) |
| Add keyframe | K |
| Play/pause | Space |

When the pointer is inside an editable input, keyboard shortcuts do not
override text entry.

**Mesh Workshop:** click **Convert to Editable Mesh**. Choose Vertex,
Edge, or Face selection, drag viewport markers, or type numeric XYZ values.
In Face mode use **Extrude Face** (height), **Inset Face** (inset fraction)
or **Bevel Face** (one chamfered face border). These operations create real
indexed geometry. Edits affect local mesh geometry and do **not** create
vertex-deformation keyframes.

**Modifiers:** in the Object Inspector, add **Subdivision** (Catmull–Clark,
levels 1–2) or **Mirror** (positive-side clipping at local X/Y/Z=0).
Reorder, enable, disable, or remove up to four modifiers.
The source cage is preserved; the evaluated mesh appears in renders.
More complex meshes may exceed conservative geometry limits.

## 4. Animate and shape curves

Framefield stores independent position, rotation, and scale keyframes per
object. Use the Dope Sheet to seek among frames and change animation duration.
Use **Graph Editor** for the nine transform channels:
Position X/Y/Z, Rotation X/Y/Z, Scale X/Y/Z.

Select an outgoing keyframe segment and choose Linear, Smooth, Ease In,
Ease Out, or Hold. With easing active, drag the golden handles to control
the cubic curve. Move keyframe points vertically to change their values
without moving their frame numbers. Undo works on curve drags.

For example, load Bouncing Ball, open Graph Editor, select Position Y, and
watch how different easing presets change acceleration between two frames.

## 5. Light and render

Use Object > Surface Material for presets Matte, Satin, Gloss, and Metal.
Use **Lighting** for ambient strength, warm/cool Key and Fill directional
lights, color, intensity, and XYZ direction.

In **Camera/Render**:

1. Position the editor camera and press **Use Editor View** to copy its pose
   into the project shot camera.
2. Adjust shot yaw, pitch, distance, and look-at target independently.
3. Choose an output resolution and background color.
4. Click **Render Frame · PNG** (or the top-bar Render PNG) to create a
   clean image without grid/gizmos.
5. For an animation, choose sequence From/To/Step and
   **Export PNG Sequence ZIP**. This outputs numbered frame PNGs.
   Frame count, pixel count, and export memory are bounded for browser safety.

**Record WebM** records the browser's current viewport in real time and
depends on browser MediaRecorder support. For clean recording, enable Shot
View first. Frame-sequence ZIP is the better path when exact numbered
frames matter. There is no MP4 encoder in this release.

## 6. Save, recover, and move between computers

**Save JSON** downloads a portable `.framefield.json` file. Always keep
copies of important projects on a drive you control.

The app also writes a debounced **local autosave** in the current browser
origin after edits. After refreshing or reopening it offers an explicit
**Restore**, **Download draft backup**, or **Discard** choice. Corrupt drafts
can be exported as raw backup data before discarding. Framefield does not
silently replace the working scene.

Browser storage is **not** a permanent archival system. Private mode,
quotas, browser cleanup, or switching devices can make drafts disappear.
There is no remote sync. The status indicator reports when the browser
has confirmed a draft write, not when a portable backup has been created.
Use Save JSON regularly.

## Scene Vault: extra protection when changing projects

The **Scene Vault** button opens your local checkpoint history. Unlike the
most recent autosave draft, vault checkpoints retain up to **five prior scenes**.

The studio automatically saves a checkpoint immediately before New Project,
Open JSON, or Create Starter Scene. Restoring from the Vault also protects the
current project before loading the older one. Each checkpoint has its project
name, timestamp and reason, plus controls for **Restore**, **Download JSON**
and **Delete** (which requires a second confirmation).

Create a manual checkpoint any time with **Save current checkpoint**.
To move a saved project to another computer, use **Download JSON** and keep the
resulting file. Vault entries stay on the current browser/device only.

**Storage unavailable?** Scene replacement pauses. You can download the
current JSON, cancel, or knowingly proceed without the local checkpoint.
Do not assume backups exist when your browser reports a storage error.
The Vault has strict memory limits and rotates old checkpoints.

## 7. Known limitations

- Canvas2D software rendering, approximate polygon shading; no GPU PBR,
  ray-traced shadows, environment reflections, or physical camera simulation.
- No sculpt mode, UV editor, skeletal rigging, animation constraints,
  general-purpose OBJ/FBX/glTF importer, or MP4 output.
- Editable mesh deformation is static. Object-level animation is keyframed.
- Mirror uses the local origin plane and positive half; no adjustable offset.
- Large modifier stacks and frame exports have safeguards and may run slowly.
- Browser-local autosave does not mean offline installation. GitHub Pages
  content availability without internet is not guaranteed.

## 8. Troubleshooting

**Blank editor or old interface after a merge:** hard-refresh the page,
check that GitHub Pages finished deploying the latest commit, and open
the browser developer console for errors.

**Can't see new topology:** select the original mesh in the scene
collection, enter the corresponding Mesh Workshop mode, and ensure the
object is visible. Modifier preview geometry does not alter source-cage
edit handles.

**Export button unavailable:** check the output resolution, range,
step, and memory/frame budget. Exporting stays within the current active tab.
The browser can also block automatic downloads.

**Local recovery offers an older scene:** download the draft backup first.
Restore only if it is the work you want, or discard it deliberately.

**Unexpected movement while modeling:** choose the correct tool G/R/S,
use **Done** to leave Mesh Workshop, and check Shot View is disabled.

## 9. Project integrity and publishing

Before treating a candidate as v1.0 stable, review the acceptance steps in
[the release checklist](V1_RELEASE_CHECKLIST.md), verify the live GitHub Pages
runtime, inspect downloadable examples, and ensure a manual project save and
reopen works in a clean browser session.

This project is independent, open-source and MIT licensed. It is not an
affiliate or fork of Blender. Blender and its features remain the work of
their respective contributors.
