import test from 'node:test';
import assert from 'node:assert/strict';
import {axisDragWorldDelta,hitMoveHandle,makeMoveHandles} from '../src/gizmo.js';
test('projected move handles resolve X/Y/Z independently',()=>{
  const handles=makeMoveHandles({position:[0,0,0]},p=>({x:100+p[0]*80-p[2]*30,y:100-p[1]*80+p[2]*30}));
  assert.deepEqual(handles.map(h=>h.name),['X','Y','Z']);
  assert.equal(hitMoveHandle(handles,170,100)?.name,'X');
  assert.equal(hitMoveHandle(handles,100,30)?.name,'Y');
  assert.equal(hitMoveHandle(handles,10,10),null);
});
test('drag projection maps screen motion into signed axis displacement',()=>{
  const h={dx:100,dy:0,length2:10000,worldLength:2};
  assert.equal(axisDragWorldDelta(h,50,0),1);
  assert.equal(axisDragWorldDelta(h,-50,0),-1);
  assert.equal(axisDragWorldDelta(h,26,0,true),.5);
});
