import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStaticGlb } from '../src/lib/parseStaticGlb.js';
import {createHash} from 'node:crypto';
import {prepareGlbImport} from '../src/glbImport.js';
import {makeBpcXrPacket} from '../src/bpcExport.js';
import {demoScene,pose,putKey,validateProject} from '../src/scene.js';
function glb(positions, indices = null, extra = {}) {
  const bytes = new Uint8Array(positions.length * 4 + (indices?.length ?? 0) * 2);
  const dv = new DataView(bytes.buffer);
  positions.forEach((n, i) => dv.setFloat32(i * 4, n, true));
  indices?.forEach((n, i) => dv.setUint16(positions.length * 4 + i * 2, n, true));
  const json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: bytes.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.length * 4 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, ...(indices ? { indices: 1 } : {}) }] }],
  };
  if (indices) {
    json.bufferViews.push({ buffer: 0, byteOffset: positions.length * 4, byteLength: indices.length * 2 });
    json.accessors.push({ bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' });
  }
  Object.assign(json, extra);
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(encoded.length / 4) * 4;
  const binLength = Math.ceil(bytes.length / 4) * 4;
  const buffer = new ArrayBuffer(12 + 8 + jsonLength + 8 + binLength);
  const out = new DataView(buffer);
  out.setUint32(0, 0x46546c67, true); out.setUint32(4, 2, true); out.setUint32(8, buffer.byteLength, true);
  out.setUint32(12, jsonLength, true); out.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, jsonLength).fill(32);
  new Uint8Array(buffer, 20).set(encoded);
  const binStart = 20 + jsonLength;
  out.setUint32(binStart, binLength, true); out.setUint32(binStart + 4, 0x004e4942, true);
  new Uint8Array(buffer, binStart + 8).set(bytes);
  return buffer;
}
const triangle = [0, 0, 0, 1, 0, 0, 0, 1, 0];
test('imports one bounded unindexed triangle', () => {
  assert.deepEqual(parseStaticGlb(glb(triangle)).faces, [[0, 1, 2]]);
});
test('imports indexed triangles', () => {
  assert.deepEqual(parseStaticGlb(glb(triangle, [2, 1, 0])).faces, [[2, 1, 0]]);
});
test('rejects out-of-range indices', () => {
  assert.throws(() => parseStaticGlb(glb(triangle, [0, 1, 7])), /invalid triangle index/);
});
test('rejects nonfinite positions', () => {
  assert.throws(() => parseStaticGlb(glb([NaN, ...triangle.slice(1)])), /nonfinite/);
});
test('rejects invalid header', () => {
  const input = glb(triangle);
  new DataView(input).setUint32(0, 0, true);
  assert.throws(() => parseStaticGlb(input), /invalid GLB header/);
});
test('rejects source vertex budget overflow', () => {
  assert.throws(() => parseStaticGlb(glb(Array(801 * 3).fill(0))), /vertex budget/);
});

test('rejects GLB node transforms instead of silently dropping them', () => {
  assert.throws(() => parseStaticGlb(glb(triangle, null,
    {nodes:[{mesh:0,translation:[2,0,0]}]})), /node transforms/);
});
test('rejects malformed non-array GLB nodes', () => {
  assert.throws(() => parseStaticGlb(glb(triangle, null,
    {nodes:{mesh:0}})), /invalid nodes/);
});

function materialBoundTriangle(extra = {}) {
  return glb(triangle, [0,1,2], {
    materials:[{pbrMetallicRoughness:{baseColorFactor:[1,.5,0,1],baseColorTexture:{index:0}}}],
    textures:[{source:0}],
    images:[{uri:'https://example.invalid/should-never-fetch.png'}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
    ...extra
  });
}

test('imports material-bound glTF as explicit flat-color approximation without fetching textures', () => {
  const preview=parseStaticGlb(materialBoundTriangle());
  assert.equal(preview.color,'#ffbc00');
  assert.deepEqual(preview.faces,[[0,1,2]]);
  assert.match(preview.warnings.join(' '),/Texture maps were not loaded/i);
  assert.match(preview.warnings.join(' '),/Flat preview color approximates/i);
});
test('rejects out-of-range material references rather than silently substituting colors', () => {
  const binary=materialBoundTriangle({
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:7}]}]
  });
  assert.throws(()=>parseStaticGlb(binary),/invalid material reference/);
});
test('rejects malformed or nonfinite baseColorFactor', () => {
  const binary=materialBoundTriangle({
    materials:[{pbrMetallicRoughness:{baseColorFactor:[1,2,0,1]}}]
  });
  assert.throws(()=>parseStaticGlb(binary),/invalid base color factor/);
});
test('synthetic material-bound GLB passes Framefield save/load and animated BPC XR export', () => {
  const input=materialBoundTriangle();
  const sha256=createHash('sha256').update(Buffer.from(input)).digest('hex');
  const imported=prepareGlbImport(input,{fileName:'pixel-compatible-static.glb',index:0,frame:0,sha256});
  assert.equal(imported.object.color,'#ffbc00');
  const moving=putKey(imported.object,30,pose([1,2,3],[0,45,0],[1,1,1]));
  const project={...demoScene(),objects:[moving]};
  const reopened=validateProject(JSON.parse(JSON.stringify(project)));
  assert.equal(reopened.objects[0].glbSource.sha256,sha256);
  const packet=makeBpcXrPacket(reopened);
  assert.equal(packet.schema,'bpc.spatial-preview.v1');
  assert.equal(packet.assets[0].color,'#ffbc00');
  assert.deepEqual(packet.assets[0].mesh.faces,[[0,1,2]]);
  assert.equal(packet.assets[0].keyframes.length,2);
  assert.equal(packet.assets[0].keyframes[1].frame,30);
  assert.ok(Math.abs(packet.assets[0].keyframes[1].rotationRadians[1]-Math.PI/4)<1e-10);
  assert.equal(packet.permissions.publish,false);
});
