import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_FRAME_RATES,durationFrameCount,clampCharacterFrame,
  frameToSeconds,secondsToFrame,advanceCharacterTime} from '../src/characterTimeline.js';

test('only 24/30 FPS are legal, with finite bounded clips',()=>{
  assert.deepEqual(CHARACTER_FRAME_RATES,[24,30]);
  assert.equal(durationFrameCount(1,24),24);
  assert.equal(durationFrameCount(1,30),30);
  assert.throws(()=>durationFrameCount(1,60),/FPS/);
  assert.throws(()=>durationFrameCount(Infinity,24),/duration/);
  assert.throws(()=>durationFrameCount(301,30),/duration/);
});

test('scrub is deterministic at both supported frame rates',()=>{
  assert.equal(frameToSeconds(12,1,24),.5);
  assert.equal(frameToSeconds(15,1,30),.5);
  assert.equal(secondsToFrame(.5,1,24),12);
  assert.equal(secondsToFrame(.5,1,30),15);
  assert.equal(frameToSeconds(0,1,24),0);
  assert.equal(frameToSeconds(24,1,24),1);
});

test('last frame clamps to true clip endpoint for fractional durations',()=>{
  assert.equal(durationFrameCount(1.01,24),25);
  assert.equal(frameToSeconds(25,1.01,24),1.01);
  assert.equal(secondsToFrame(1.01,1.01,24),24);
  assert.equal(clampCharacterFrame(999,1.01,24),25);
  assert.equal(clampCharacterFrame(-12,1,24),0);
});

test('loop repeats and non-looping clips stop exactly at duration',()=>{
  assert.deepEqual(advanceCharacterTime(.8,.4,1,true),{seconds:.20000000000000018,playing:true});
  assert.deepEqual(advanceCharacterTime(.8,.4,1,false),{seconds:1,playing:false});
  assert.deepEqual(advanceCharacterTime(.3,.2,1,false),{seconds:.5,playing:true});
});

test('invalid frame/time input is safe and never creates negative positions',()=>{
  assert.equal(clampCharacterFrame(NaN,1,24),0);
  assert.equal(secondsToFrame(Infinity,1,24),0);
  assert.throws(()=>advanceCharacterTime(0,NaN,1),/invalid/);
  assert.deepEqual(advanceCharacterTime(0,-.5,1,false),{seconds:0,playing:true});
});
