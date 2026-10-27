import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlbObject} from '../src/glbImport.js';
import {demoScene,validateProject} from '../src/scene.js';

const sha256='a'.repeat(64);
const mesh={vertices:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]};
function imported(overrides={}){
  return createGlbObject(mesh,{fileName:'licensed-model.glb',index:2,frame:15,sha256,...overrides});
}
test('creates one editable, keyed Framefield object with source-only provenance',()=>{
  const result=imported();
  assert.equal(result.name,'licensed-model');
  assert.equal(result.type,'box');
  assert.deepEqual(result.geometry,mesh);
  assert.equal(result.keyframes[0].frame,15);
  assert.equal(result.glbSource.sha256,sha256);
  assert.notEqual(result.geometry,mesh);
});
test('persists original GLB evidence across project validation / JSON reload',()=>{
  const result=imported();
  const raw={...demoScene(),objects:[result]};
  const loaded=validateProject(JSON.parse(JSON.stringify(raw)));
  assert.equal(loaded.objects.length,1);
  assert.equal(loaded.objects[0].glbSource.sha256,sha256);
  assert.equal(loaded.objects[0].glbSource.fileName,'licensed-model.glb');
  assert.deepEqual(loaded.objects[0].geometry,mesh);
});
test('a changed imported mesh does not change source digest claims',()=>{
  const result=imported();
  result.geometry.vertices[0][0]=.25;
  const loaded=validateProject({...demoScene(),objects:[result]});
  assert.equal(loaded.objects[0].glbSource.sha256,sha256);
  assert.match(loaded.objects[0].glbSource.description,/original GLB bytes/i);
});
test('rejects invalid SHA-256 and invalid scene insertion bounds',()=>{
  assert.throws(()=>imported({sha256:'not-hex'}),/SHA-256/);
  assert.throws(()=>imported({index:100}),/invalid scene position/);
  assert.throws(()=>imported({frame:601}),/invalid scene position/);
});
test('rejects degenerate imported faces',()=>{
  assert.throws(()=>createGlbObject({vertices:mesh.vertices,faces:[[0,0,1]]},
    {fileName:'bad.glb',index:0,frame:0,sha256}),/Invalid mesh face/);
  assert.throws(()=>createGlbObject({vertices:[[0,0,0],[1,0,0],[2,0,0]],faces:[[0,1,2]]},
    {fileName:'flat.glb',index:0,frame:0,sha256}),/degenerate triangle/);
});
test('rejects tampered source metadata during project load',()=>{
  const result=imported();
  result.glbSource.sha256='incorrect';
  assert.throws(()=>validateProject({...demoScene(),objects:[result]}),/Invalid original GLB source evidence/);
});
