import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneMesh,primitiveMesh} from '../src/mesh.js';
import {sanitizeModifiers,subdivideOnce,mirrorHalf,evaluateModifiers} from '../src/modifiers.js';
const cube=()=>cloneMesh(primitiveMesh('box'));
test('Catmull-Clark subdivides a cube into smooth 24-quad 26-vertex topology',()=>{
  const original=cube(),result=subdivideOnce(original);
  assert.equal(result.vertices.length,26);
  assert.equal(result.faces.length,24);
  assert.ok(result.faces.every(face=>face.length===4));
  assert.ok(result.vertices.every(v=>v.every(Number.isFinite)));
  assert.deepEqual(original,cube());
});
test('second subdivision produces 98 vertices and 96 faces',()=>{
  const twice=subdivideOnce(subdivideOnce(cube()));
  assert.equal(twice.vertices.length,98);
  assert.equal(twice.faces.length,96);
});
test('Mirror X clips full cube to positive half and welds seam',()=>{
  const source=cube(),result=mirrorHalf(source,0);
  assert.equal(result.vertices.length,12);
  assert.equal(result.faces.length,10);
  const seam=result.vertices.filter(v=>v[0]===0);
  assert.equal(seam.length,4);
  const positive=result.vertices.filter(v=>v[0]>0).length;
  const negative=result.vertices.filter(v=>v[0]<0).length;
  assert.equal(positive,negative);
  assert.deepEqual(source,cube());
});
test('Mirror Y and Z symmetry and modifier order are evaluated independently',()=>{
  for(const axis of [1,2]){
    const mesh=mirrorHalf(cube(),axis);
    assert.equal(mesh.faces.length,10);
    assert.ok(mesh.vertices.some(v=>v[axis]<0));
    assert.ok(mesh.vertices.some(v=>v[axis]>0));
  }
  const source=cube();
  const a=evaluateModifiers({type:'box',geometry:source,modifiers:[
    {type:'mirror',enabled:true,axis:0},{type:'subdivide',enabled:true,levels:1}
  ]});
  const b=evaluateModifiers({type:'box',geometry:source,modifiers:[
    {type:'subdivide',enabled:true,levels:1},{type:'mirror',enabled:true,axis:0}
  ]});
  assert.equal(a.faces.length,40);
  assert.ok(b.faces.length>0);
  assert.deepEqual(source,cube());
});
test('disabled modifiers never alter source geometry or output',()=>{
  const obj={type:'box',geometry:cube(),modifiers:[{type:'subdivide',levels:2,enabled:false}]};
  assert.equal(evaluateModifiers(obj),obj.geometry);
  assert.deepEqual(sanitizeModifiers(undefined),[]);
  assert.deepEqual(sanitizeModifiers([{type:'mirror',axis:2}]),
    [{type:'mirror',axis:2,enabled:true}]);
});
test('import guards reject bad modifier values and excess stack size',()=>{
  assert.throws(()=>sanitizeModifiers([{type:'subdivide',enabled:true,levels:7}]),/levels/);
  assert.throws(()=>sanitizeModifiers([{type:'mirror',axis:4}]),/axis/);
  assert.throws(()=>sanitizeModifiers([{type:'unknown',axis:0}]),/Unknown/);
  assert.throws(()=>sanitizeModifiers(Array.from({length:5},()=>({type:'mirror',axis:0}))),/stack/);
});
test('complex subdivision gracefully stops before allocating enormous geometry',()=>{
  // Separate quads have manifold/boundary edges but overflow the output budget.
  const large={vertices:Array.from({length:6000},(_,i)=>[i%100,Math.floor(i/100),0]),
    faces:Array.from({length:1500},(_,i)=>[i*4,i*4+1,i*4+2,i*4+3])};
  assert.throws(()=>subdivideOnce(large),/budget/);
});
