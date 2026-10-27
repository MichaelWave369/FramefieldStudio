// Strict, dependency-free GLB 2.0 static geometry reader.
// Returns data only; never fetches URIs or modifies a scene.
const MAX_BYTES = 16 * 1024 * 1024;
const MAX_VERTICES = 800;
const MAX_FACES = 1200;
const COMPONENT_BYTES = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function fail(message) { throw new Error('GLB import: ' + message); }
function checkedRange(start, size, limit) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(size) || start < 0 || size < 0 || start + size > limit) fail('out-of-bounds data');
}
function accessor(json, binary, index, expectedType, expectedComponent) {
  const a = json.accessors?.[index];
  if (!a || a.type !== expectedType || a.componentType !== expectedComponent ||
      !Number.isInteger(a.count) || a.count < 1 || a.sparse || a.normalized ||
      !Number.isInteger(a.bufferView)) fail('unsupported accessor');
  const view = json.bufferViews?.[a.bufferView];
  if (!view || view.buffer !== 0 || view.byteStride !== undefined) fail('unsupported buffer view');
  const bytes = COMPONENT_BYTES[a.componentType];
  const count = TYPE_SIZE[a.type];
  const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const size = a.count * count * bytes;
  checkedRange(view.byteOffset ?? 0, view.byteLength, binary.byteLength);
  checkedRange(start, size, (view.byteOffset ?? 0) + view.byteLength);
  if (start % bytes !== 0) fail('misaligned accessor');
  const dv = new DataView(binary.buffer, binary.byteOffset + start, size);
  const out = [];
  for (let i = 0; i < a.count; i++) {
    const values = [];
    for (let j = 0; j < count; j++) {
      const at = (i * count + j) * bytes;
      const value = bytes === 1 ? dv.getUint8(at) :
        bytes === 2 ? dv.getUint16(at, true) :
        a.componentType === 5125 ? dv.getUint32(at, true) : dv.getFloat32(at, true);
      if (!Number.isFinite(value)) fail('nonfinite value');
      values.push(value);
    }
    out.push(count === 1 ? values[0] : values);
  }
  return out;
}
// Convert only the uniform glTF baseColorFactor for Framefield's flat preview.
// Texture pixels and full PBR semantics are intentionally not decoded or fetched.
function flatPreviewColor(materials, index) {
  if (index === undefined) return { color: null, warnings: [] };
  if (!Number.isInteger(index) || index < 0 || !Array.isArray(materials) ||
      index >= materials.length) fail('invalid material reference');
  const material = materials[index];
  if (!material || typeof material !== 'object' || Array.isArray(material)) fail('invalid material');
  const pbr = material.pbrMetallicRoughness;
  if (pbr !== undefined && (!pbr || typeof pbr !== 'object' || Array.isArray(pbr)))
    fail('invalid PBR material');
  const factor = pbr?.baseColorFactor ?? [1, 1, 1, 1];
  if (!Array.isArray(factor) || factor.length !== 4 ||
      factor.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1))
    fail('invalid base color factor');
  // glTF factors are linear; browser CSS #rrggbb expects sRGB encoding.
  const channel = linear => Math.round(255 * (linear <= 0.0031308
    ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055))
    .toString(16).padStart(2, '0');
  const color = '#' + factor.slice(0, 3).map(channel).join('');
  const warnings = [
    'Flat preview color approximates glTF baseColorFactor only; original material shading is not preserved.'
  ];
  if (pbr?.baseColorTexture || material.normalTexture || material.occlusionTexture ||
      material.emissiveTexture)
    warnings.push('Texture maps were not loaded or preserved.');
  if (factor[3] !== 1 || (material.alphaMode && material.alphaMode !== 'OPAQUE'))
    warnings.push('Material alpha and transparency were not preserved.');
  warnings.push('Metalness, roughness, emissive shading, UVs and normals are not preserved.');
  return { color, warnings };
}

export function parseStaticGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer)) fail('expected ArrayBuffer');
  if (buffer.byteLength > MAX_BYTES || buffer.byteLength < 20) fail('invalid file size');
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2 ||
      dv.getUint32(8, true) !== buffer.byteLength) fail('invalid GLB header');
  let offset = 12, json = null, binary = null;
  while (offset < buffer.byteLength) {
    checkedRange(offset, 8, buffer.byteLength);
    const length = dv.getUint32(offset, true), type = dv.getUint32(offset + 4, true);
    offset += 8;
    if (length % 4) fail('unaligned chunk');
    checkedRange(offset, length, buffer.byteLength);
    if (type === 0x4e4f534a && json === null && binary === null) {
      try { json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buffer, offset, length))); }
      catch { fail('invalid JSON'); }
    } else if (type === 0x004e4942 && json !== null && binary === null) {
      binary = new Uint8Array(buffer, offset, length);
    } else fail('unsupported chunk layout');
    offset += length;
  }
  if (!json || !binary || json.asset?.version !== '2.0' ||
      json.extensionsRequired?.length || json.buffers?.length !== 1 ||
      json.buffers[0].uri !== undefined || json.buffers[0].byteLength > binary.byteLength)
    fail('unsupported GLB document');
  if (json.nodes !== undefined && !Array.isArray(json.nodes))
    fail('invalid nodes');
  if (json.nodes?.some(n => !n || typeof n !== 'object' ||
        n.matrix !== undefined || n.translation !== undefined ||
        n.rotation !== undefined || n.scale !== undefined))
    fail('node transforms are not supported');
  if (json.nodes?.some(n => n.skin !== undefined) || json.skins?.length || json.animations?.length)
    fail('rigging and glTF animation not supported');
  const mesh = json.meshes?.length === 1 ? json.meshes[0] : null;
  if (!mesh || mesh.primitives?.length !== 1) fail('requires one mesh primitive');
  const primitive = mesh.primitives[0];
  if (primitive.mode !== undefined && primitive.mode !== 4) fail('triangles only');
  if (primitive.targets) fail('morphs not supported');
  const preview = flatPreviewColor(json.materials, primitive.material);
  const vertices = accessor(json, binary, primitive.attributes?.POSITION, 'VEC3', 5126);
  if (vertices.length > MAX_VERTICES) fail('vertex budget exceeded');
  if (primitive.indices !== undefined &&
      ![5121, 5123, 5125].includes(json.accessors?.[primitive.indices]?.componentType))
    fail('unsupported index component');
  const indices = primitive.indices === undefined
    ? vertices.map((_, i) => i)
    : accessor(json, binary, primitive.indices, 'SCALAR',
        json.accessors[primitive.indices].componentType);
  if (indices.length % 3 || indices.length / 3 > MAX_FACES) fail('triangle budget exceeded');
  const faces = [];
  for (let i = 0; i < indices.length; i += 3) {
    const tri = indices.slice(i, i + 3);
    if (tri.some(n => !Number.isInteger(n) || n >= vertices.length)) fail('invalid triangle index');
    faces.push(tri);
  }
  return { vertices, faces, color: preview.color,
    warnings: [
      'Geometry-only import: textures, UVs, normals, node transforms and animation are not imported.',
      ...preview.warnings
    ] };
}
