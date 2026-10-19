import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMoveHandles,makeRotateHandles,hitRotateHandle,screenRotationDelta,scaledAxisValue} from '../src/gizmo.js';

test('world-axis projected rings have 73 samples and are hittable',()=>{
 const project=p=>({x:200+p[0]*60+p[2]*25,y:200-p[1]*60+p[2]*15});
 const rings=makeRotateHandles({position:[0,0,0]},project);
 assert.equal(rings.length,3);
 assert.ok(rings.every(h=>h.points.length===73));
 const ring=rings.find(r=>r.name==='Z');
 assert.equal(hitRotateHandle([ring],ring.points[9].x,ring.points[9].y)?.name,'Z');
 assert.equal(hitRotateHandle(rings,1200,1200),null);
});
test('screen rotation preserves sign and snaps to 15-degree increments',()=>{
 const center={x:0,y:0},start={x:100,y:0};
 assert.equal(screenRotationDelta(center,start,{x:0,y:100}),90);
 assert.equal(screenRotationDelta(center,start,{x:0,y:-100}),-90);
 assert.equal(screenRotationDelta(center,start,{x:86.6,y:50},true),30);
 assert.equal(screenRotationDelta(center,start,{x:86.6,y:50},false)>29,true);
 assert.equal(screenRotationDelta(center,start,{x:0,y:0}),0);
});
test('axis scale is bounded and maintains mirrored geometry sign',()=>{
 const h={worldLength:2,dx:100,dy:0,length2:10000};
 assert.equal(scaledAxisValue(2,h,50,0),3.2);
 assert.equal(scaledAxisValue(-2,h,50,0),-3.2);
 assert.equal(scaledAxisValue(0,h,-10000,0),.05);
 assert.equal(scaledAxisValue(1,h,40,0,true),1.5);
});
