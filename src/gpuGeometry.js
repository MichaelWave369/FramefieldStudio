// Framefield scene-to-GPU preview adapter. SPDX-License-Identifier: MIT
// The source project and its geometry are never modified.
import {atFrame} from './scene.js';
import {evaluateModifiers} from './modifiers.js';

export const MAX_GPU_PREVIEW_TRIANGLES = 120000;

/**
 * Expand current polygon meshes into non-indexed triangles for a GPU preview.
 * Face fans are intentionally limited to the same small convex authoring meshes
 * that Framefield's original editor produces; this is not arbitrary glTF import.
 */
export function makeGpuDrawables(project, frame) {
  const result = [];
  let triangleCount = 0;
  for (const object of project.objects) {
    if (object.visible === false) continue;
    const mesh = evaluateModifiers(object);
    const triangles = [];
    for (const face of mesh.faces) {
      if (face.length < 3) continue;
      for (let i = 1; i < face.length - 1; i++) {
        triangleCount++;
        if (triangleCount > MAX_GPU_PREVIEW_TRIANGLES) {
          throw Error('GPU preview triangle budget exceeded; switch to Software View.');
        }
        for (const index of [face[0], face[i], face[i + 1]]) {
          triangles.push(...mesh.vertices[index]);
        }
      }
    }
    result.push({
      id: object.id,
      color: object.color,
      material: object.material,
      pose: atFrame(object, frame),
      positions: triangles,
    });
  }
  return result;
}
