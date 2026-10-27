import test from 'node:test';
import assert from 'node:assert/strict';
import {demoScene,makeObject,putKey,pose} from '../src/scene.js';
import {makeBpcXrPacket} from '../src/bpcExport.js';
const clone=x=>structuredClone(x);

test('Framefield demo can export TWO visible primitives without a manual mesh conversion',()=>{
  const scene=demoScene(),copy=clone(scene),result=makeBpcXrPacket(scene);
  assert.deepEqual(scene,copy);
  assert.equal(result.schema,'bpc.spatial-preview.v1');
  assert.equal(result.source.format,'framefield.scene.v1');
  assert.equal(result.source.sourceObjectCount,2);
  assert.equal(result.source.fps,24);
  assert.equal(result.source.duration,120);
  assert.equal(result.assets.length,2);
  for(const a of result.assets){
    assert.equal(a.mesh.representation,'editable-source-cage');
    assert.ok(a.mesh.faces.length>0);
    assert.ok(a.mesh.faces.every(face=>face.length===3));
    assert.deepEqual(a.modifiers,[]);
  }
  assert.equal(result.assets[0].keyframes[1].rotationRadians[1],Math.PI);
});
test('generated cylinder caps and curved primitives triangulate within receiver budget',()=>{
  const scene=demoScene();
  scene.objects=['pyramid','cylinder','torus','sphere'].map((type,i)=>({...makeObject(type,i),name:type}));
  const packet=makeBpcXrPacket(scene);
  assert.equal(packet.assets.length,4);
  assert.ok(packet.assets[1].mesh.faces.length>=30);
  assert.ok(packet.assets[2].mesh.faces.length>=200);
});
test('preserves authored cubic easing and hold between animation keys',()=>{
  const scene=demoScene();scene.objects=[{...makeObject('box',0)}];
  scene.objects[0].keyframes=[
    {frame:0,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],
      curves:{'position.0':'hold','rotation.1':[.42,0,.58,1]}},
    {frame:60,position:[2,0,0],rotation:[0,180,0],scale:[1,1,1]}
  ];
  const p=makeBpcXrPacket(scene);
  assert.deepEqual(p.assets[0].keyframes[0].curves['rotation.1'],[.42,0,.58,1]);
  assert.equal(p.assets[0].keyframes[0].curves['position.0'],'hold');
  assert.equal(p.assets[0].keyframes[1].rotationRadians[1],Math.PI);
});
test('evaluates modifiers on export, leaves source stacks unmodified',()=>{
  const scene=demoScene();scene.objects=[{...makeObject('box',0),modifiers:[{type:'subdivide',levels:1,enabled:true}]}];
  const before=clone(scene);
  const p=makeBpcXrPacket(scene);
  assert.ok(p.assets[0].mesh.faces.length>12);
  assert.deepEqual(p.assets[0].modifiers,[]);
  assert.deepEqual(scene,before);
});
test('authorities stay false and output fits 5 MiB',()=>{
  const p=makeBpcXrPacket(demoScene());
  assert.deepEqual(p.permissions,{execute:false,importIntoEditor:false,render:false,publish:false});
  assert.ok(new TextEncoder().encode(JSON.stringify(p)).byteLength<5*1024*1024);
});
test('bad cases are rejected without mutating scene',()=>{
  const zero=demoScene();zero.objects=[];
  assert.throws(()=>makeBpcXrPacket(zero),/at least one visible/);
  const tooMany=demoScene();tooMany.objects=Array.from({length:13},(_,i)=>makeObject('box',i));
  assert.throws(()=>makeBpcXrPacket(tooMany),/at most 12/);
  const huge=demoScene();huge.objects[0].keyframes[0].position=[40,0,0];
  assert.throws(()=>makeBpcXrPacket(huge),/invalid.*position/);
  const curve=demoScene();curve.objects[0].keyframes[0].curves={'scale.9':[0,0,1,1]};
  assert.throws(()=>makeBpcXrPacket(curve),/unsupported animation curve/);
  const bad=demoScene();bad.objects[0].geometry={vertices:[[0,0,0],[1,0,0],[0,1,0],[0,0,1]],faces:[[0,1,2,3]]};
  assert.throws(()=>makeBpcXrPacket(bad),/nonplanar edited face/);
  const concave=demoScene();concave.objects[0].geometry={vertices:[[0,0,0],[2,0,0],[1,.5,0],[2,2,0],[0,2,0]],faces:[[0,1,2,3,4]]};
  assert.throws(()=>makeBpcXrPacket(concave),/concave edited face/);
});
