import test from 'node:test';
import assert from 'node:assert/strict';
import {makePosePack,readPosePack,validatePoseEntry,clampMorphWeight,
  MAX_NAMED_POSES,POSE_PACK_FORMAT} from '../src/characterPosePack.js';

const sha='a'.repeat(64);
const context={durations:[1],morphIds:['0:0','1:0']};
const pose=(overrides={})=>({
  name:'Friendly smile',clipIndex:0,frame:12,fps:24,morphs:{'0:0':.75},...overrides
});
test('source-locked versioned pack roundtrips named frame and facial morph weights',()=>{
  const book=makePosePack(sha,[pose()],context);
  assert.equal(book.format,POSE_PACK_FORMAT);
  assert.equal(book.version,1);
  assert.deepEqual(readPosePack(JSON.parse(JSON.stringify(book)),sha,context),book);
});

test('pose pack refuses unrelated characters, unsupported versions and unknown morphs',()=>{
  const book=makePosePack(sha,[pose()],context);
  assert.throws(()=>readPosePack(book,'b'.repeat(64),context),/different GLB/);
  assert.throws(()=>readPosePack({...book,version:99},sha,context),/unsupported format/);
  assert.throws(()=>makePosePack(sha,[pose({morphs:{'2:0':.5}})],context),/unavailable expression/);
  assert.throws(()=>makePosePack(sha,[pose({morphs:{'__proto__':1}})],context),/invalid/);
});

test('saved poses validate clip frames, labels, expression bounds and duplicates',()=>{
  assert.throws(()=>validatePoseEntry(pose({frame:25}),context),/frame outside/);
  assert.throws(()=>validatePoseEntry(pose({clipIndex:5}),context),/unavailable animation/);
  assert.throws(()=>validatePoseEntry(pose({name:''}),context),/pose names/);
  assert.throws(()=>validatePoseEntry(pose({fps:60}),context),/FPS/);
  assert.throws(()=>validatePoseEntry(pose({morphs:{'0:0':-1}}),context),/expression/);
  assert.throws(()=>makePosePack(sha,[pose(),pose({name:'FRIENDLY SMILE'})],context),/duplicate/);
  assert.throws(()=>makePosePack(sha,Array(MAX_NAMED_POSES+1).fill(pose()),context),/too many/);
});
test('static assets can save pose at frame zero, invalid morph values clamp safely',()=>{
  const staticContext={durations:[],morphIds:['0:0']};
  const single=validatePoseEntry({name:'Smile',clipIndex:-1,frame:0,
    fps:24,morphs:{'0:0':1}},staticContext);
  assert.equal(single.clipIndex,-1);
  assert.equal(clampMorphWeight(4),1);
  assert.equal(clampMorphWeight(-3),0);
  assert.equal(clampMorphWeight(NaN),0);
});
