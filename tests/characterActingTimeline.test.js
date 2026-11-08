import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTING_SHEET_FORMAT,makeActingSheet,readActingSheet,
 validateActingData,evaluateExpressionTrack,validateExpressionKey,validateDialogueCue,
 MAX_ACTING_KEYS,MAX_DIALOGUE_CUES} from '../src/characterActingTimeline.js';

const sha='c'.repeat(64);
const ctx={durations:[1,2],morphIds:['0:0','0:1']};
const key=(timeMs,weight,interpolation='linear')=>({
 clipIndex:0,timeMs,interpolation,morphs:{'0:0':weight,'0:1':0}
});
test('expression frames interpolate linearly, hold on request, and preserve endpoints',()=>{
 const keys=validateActingData([key(1000,1),key(0,0)],[],ctx).keys;
 assert.equal(evaluateExpressionTrack(keys,0,0,ctx.morphIds)['0:0'],0);
 assert.equal(evaluateExpressionTrack(keys,0,250,ctx.morphIds)['0:0'],.25);
 assert.equal(evaluateExpressionTrack(keys,0,500,ctx.morphIds)['0:0'],.5);
 assert.equal(evaluateExpressionTrack(keys,0,1000,ctx.morphIds)['0:0'],1);
 assert.equal(evaluateExpressionTrack(keys,1,500,ctx.morphIds),null);
 assert.equal(evaluateExpressionTrack([key(0,0,'hold'),key(1000,1)],0,500,ctx.morphIds)['0:0'],0);
});
test('cue times are milliseconds, independent of preview FPS, and source-locked',()=>{
 const original=makeActingSheet(sha,[key(500,.8)],
   [{clipIndex:0,timeMs:500,text:'Hi there!'}],ctx);
 assert.equal(original.format,ACTING_SHEET_FORMAT);
 assert.equal(original.version,1);
 assert.deepEqual(readActingSheet(JSON.parse(JSON.stringify(original)),sha,ctx),original);
 assert.throws(()=>readActingSheet(original,'d'.repeat(64),ctx),/another GLB/);
 assert.throws(()=>readActingSheet({...original,version:2},sha,ctx),/unsupported/);
});
test('reject mismatched clips, invalid morph IDs, duplicates, malformed text and boundaries',()=>{
 assert.throws(()=>validateExpressionKey(key(1001,1),ctx),/outside clip/);
 assert.throws(()=>validateExpressionKey({...key(0,0),clipIndex:4},ctx),/unknown clip/);
 assert.throws(()=>validateExpressionKey({...key(0,0),interpolation:'ease'},ctx),/interpolation/);
 assert.throws(()=>validateExpressionKey({...key(0,0),morphs:{'0:2':1}},ctx),/unknown expression/);
 assert.throws(()=>validateExpressionKey({...key(0,0),morphs:{'0:0':Infinity}},ctx),/invalid weight/);
 assert.throws(()=>validateActingData([key(0,0),key(0,1)],[],ctx),/duplicate/);
 assert.throws(()=>validateDialogueCue({clipIndex:0,timeMs:500,text:' '},ctx),/printable/);
 assert.throws(()=>validateDialogueCue({clipIndex:0,timeMs:500,text:'hello\nworld'},ctx),/printable/);
 assert.throws(()=>validateDialogueCue({clipIndex:0,timeMs:500,text:'x'.repeat(241)},ctx),/240/);
 assert.throws(()=>makeActingSheet(sha,Array(MAX_ACTING_KEYS+1).fill(key(0,0)),[],ctx),/too many/);
 assert.throws(()=>makeActingSheet(sha,[],Array(MAX_DIALOGUE_CUES+1).fill({
   clipIndex:0,timeMs:0,text:'Hey'
 }),ctx),/too many/);
});
test('no expression frames means source morph animation remains visible',()=>{
 assert.equal(evaluateExpressionTrack([],0,0,ctx.morphIds),null);
 assert.deepEqual(Object.assign({},evaluateExpressionTrack([key(0,1)],0,0,ctx.morphIds)),
   {'0:0':1,'0:1':0});
});
