# FramefieldStudio → BPC → Domistika XR: native BPC export v0.1

Use the new **Export BPC XR** button in Framefield's top toolbar. It downloads a bounded \`bpc.spatial-preview.v1\` packet directly from the current scene. No manual file re-import in the BPC Studio Lot is needed, and Framefield still supports native \`Save JSON\`.

1. Edit and animate objects normally in Framefield Studio.
2. Click **Export BPC XR**. A \`*.bpc-xr.json\` file downloads locally.
3. Open [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html), select **Load BPC mesh** in the sidebar and choose that download.
4. View on desktop or in Quest 3; play/pause and scrub Framefield's transforms from the sidebar or XR tool panel. Clear the preview when done.

## Contract boundaries

- The exporter evaluates Framefield's existing primitives or source meshes and enabled mirror/subdivision modifiers *without mutating* the author's original scene, triangulates those evaluated surfaces and emits a read-only BPC mesh-cage packet. No need to manually convert a box or a sphere to editable mesh.
- Per-axis outgoing easing, position, scale, keyframes, radians and original FPS/duration survive.
- Up to **12 visible** objects, at most 800 vertices and 1200 triangles per object, overall 3500 source vertices and 9000 triangles, absolute geometry/pose limits and a 5 MiB JSON packet.
- Edited nonplanar/concave polygons and degenerate authored polygons **fail closed**; primitives may have skipped zero-area pole triangles.
- Hidden objects are excluded, not overridden. If a scene is too large, hide some objects or simplify the mesh before export.

**This is not a native Framefield save.** Continue saving the \`*.framefield.json\` source. BPC XR export does not include material/shader fidelity, true spatial drawing, GLB/STL, skeletal animation, raycast collision, printing/manifold guarantees, render authority or publishing rights.

All operations are local; no automatic network handoff or cross-origin scripting. The BPC packet asserts \`execute=false\`, \`importIntoEditor=false\`, \`render=false\`, and \`publish=false\`. It does not establish authorship, content rights, or proof of operator approval.

### Coordinate order caution

Framefield \`transformVertex\` applies X, then Y, then Z rotations. A Three.js receiver should use Euler order \`ZYX\` so imported poses match source rendering, rather than default \`XYZ\`. BPC declares source-native coordinate space, not physical meters. The Domistika XR receiver's matching order should be qualified separately.

Test locally with \`npm test\` and \`npm run build\` before merging. On Quest 3, test original polygon and curved objects, eased transforms, controller animation button, and clearing the read-only preview. No device acceptance is claimed by CI.
