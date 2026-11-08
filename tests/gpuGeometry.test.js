import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGpuDrawables,MAX_GPU_PREVIEW_TRIANGLES} from '../src/gpuGeometry.js';
import {demoScene,makeObject,pose,putKey} from '../src/scene.js';

test('GPU adapter triangulates evaluated meshes without modifying scene JSON',()=>{
  const scene=demoScene();
  const before=JSON.stringify(scene);
  const drawables=makeGpuDrawables(scene,0);
  assert.equal(drawables.length,2);
  assert.equal(drawables[0].positions.length,36*3); // 12 triangles, 9 coordinates
  assert.equal(drawables[1].positions.length>0,true);
  assert.equal(JSON.stringify(scene),before);
  assert.ok(MAX_GPU_PREVIEW_TRIANGLES>=12000);
});

test('GPU adapter uses the exact Framefield timeline and omits hidden objects',()=>{
  const object=makeObject('box',0,0);
  const next=putKey(object,24,pose([4,2,0],[0,90,0],[1,1,1]));
  const hidden={...makeObject('sphere',1,0),visible:false};
  const scene={objects:[next,hidden]};
  const at12=makeGpuDrawables(scene,12);
  assert.equal(at12.length,1);
  assert.deepEqual(at12[0].pose.position,[1,1,0]); // box starts at x=-2
  assert.deepEqual(at12[0].pose.rotation,[0,45,0]);
});

test('GPU adapter previews modifiers rather than saving derived geometry',()=>{
  const object={...makeObject('box',0,0),
    modifiers:[{type:'subdivide',enabled:true,levels:1}]};
  const original=JSON.stringify(object);
  const triangles=makeGpuDrawables({objects:[object]},0)[0].positions.length/9;
  assert.equal(triangles,48); // 24 quads triangulated
  assert.equal(JSON.stringify(object),original);
});
