import test from 'node:test';
import assert from 'node:assert/strict';
import {atFrame,demoScene,makeObject,pose,putKey,validateProject} from '../src/scene.js';
test('demo scene contains two keyframed primitives',()=>{
  const s=demoScene();assert.equal(s.objects.length,2);assert.equal(s.duration,120);
});
test('keyframe interpolation is linear',()=>{
  const o=putKey(putKey(makeObject('box',0,0),0,pose([0,0,0])),10,pose([10,2,0]));
  assert.deepEqual(atFrame(o,5).position,[5,1,0]);
});
test('upserting a key does not create duplicate frames',()=>{
  const o=putKey(putKey(makeObject(),0,pose()),0,pose([2,3,4]));
  assert.equal(o.keyframes.length,1);assert.deepEqual(atFrame(o,0).position,[2,3,4]);
});
test('invalid import is rejected and valid JSON is normalized',()=>{
  assert.throws(()=>validateProject({objects:[{type:'javascript',keyframes:[]}]}));
  const good=validateProject(JSON.parse(JSON.stringify(demoScene())));
  assert.equal(good.objects.length,2);assert.equal(good.fps,24);
  assert.throws(()=>validateProject({objects:Array(101).fill({})}));
});
