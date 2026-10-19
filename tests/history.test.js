import test from 'node:test';
import assert from 'node:assert/strict';
import {initialHistory,commitHistory,amendHistory,undoHistory,redoHistory} from '../src/history.js';

test('undo/redo restores editor states and new edits clear redo',()=>{
  let h=initialHistory({x:0});
  h=commitHistory(h,s=>({...s,x:1}));
  h=commitHistory(h,s=>({...s,x:2}));
  h=undoHistory(h);assert.equal(h.present.x,1);
  h=undoHistory(h);assert.equal(h.present.x,0);
  h=redoHistory(h);assert.equal(h.present.x,1);
  h=commitHistory(h,s=>({...s,x:7}));
  assert.equal(h.future.length,0);
  assert.equal(redoHistory(h),h);
});
test('continuous move commits one action and amends while dragging',()=>{
  let h=initialHistory({x:0});
  h=commitHistory(h,s=>({...s,x:1}));
  for(let x=2;x<=25;x++)h=amendHistory(h,s=>({...s,x}));
  assert.equal(h.past.length,1);
  assert.equal(undoHistory(h).present.x,0);
  assert.equal(redoHistory(undoHistory(h)).present.x,25);
});
test('history keeps at most 70 past states',()=>{
  let h=initialHistory(0);
  for(let i=1;i<80;i++)h=commitHistory(h,i);
  assert.equal(h.past.length,70);
  assert.equal(h.present,79);
});
