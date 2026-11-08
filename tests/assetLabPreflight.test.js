import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCharacterGlb,MAX_CHARACTER_GLB_BYTES} from '../src/assetLabPreflight.js';
import {makeCharacterGlb} from './fixtures/characterGlb.js';
const arrayBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);

test('Character Lab accepts local-only embedded textured/skinned animated GLB',()=>{
  const bytes=makeCharacterGlb();
  const summary=inspectCharacterGlb(arrayBuffer(bytes));
  assert.equal(summary.meshes,1);
  assert.equal(summary.skins,1);
  assert.equal(summary.animations,1);
  assert.equal(summary.textures,1);
  assert.equal(summary.materials,1);
  assert.equal(summary.vertices,3);
});

test('Character Lab refuses external image URLs even when other data is embedded',()=>{
  const bytes=makeCharacterGlb({externalImage:true});
  assert.throws(()=>inspectCharacterGlb(arrayBuffer(bytes)),/never external URIs/);
});

test('Character Lab refuses malformed header, oversize model, and non-GLB data',()=>{
  const bytes=makeCharacterGlb();
  bytes.writeUInt32LE(999,8);
  assert.throws(()=>inspectCharacterGlb(arrayBuffer(bytes)),/invalid GLB 2.0 header/);
  assert.throws(()=>inspectCharacterGlb(new ArrayBuffer(MAX_CHARACTER_GLB_BYTES+4)),/24 MiB/);
  assert.throws(()=>inspectCharacterGlb('test'),/24 MiB/);
});
