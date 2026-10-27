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
  if (primitive.targets || primitive.material !== undefined) fail('morphs and materials not yet supported');
  const vertices = accessor(json, binary, primitive.attributes?.POSITION, 'VEC3', 5126);
  if (vertices.length > MAX_VERTICES) fail('vertex budget exceeded');
  const indices = primitive.indices === undefined
    ? vertices.map((_, i) => i)
    : accessor(json, binary, primitive.indices, 'SCALAR',
        json.accessors[primitive.indices]?.componentType);
  if (![5121, 5123, 5125].includes(json.accessors?.[primitive.indices]?.componentType) &&
      primitive.indices !== undefined) fail('unsupported index component');
  if (indices.length % 3 || indices.length / 3 > MAX_FACES) fail('triangle budget exceeded');
  const faces = [];
  for (let i = 0; i < indices.length; i += 3) {
    const tri = indices.slice(i, i + 3);
    if (tri.some(n => !Number.isInteger(n) || n >= vertices.length)) fail('invalid triangle index');
    faces.push(tri);
  }
  return { vertices, faces, warnings: ['Geometry only: materials, textures, UVs, normals, nodes and transforms are not imported.'] };
}
