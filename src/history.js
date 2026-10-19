// Bounded, in-memory editor history. One committed action is one Undo step.
// SPDX-License-Identifier: MIT
export function initialHistory(present) {
  return {past:[],present,future:[]};
}
function resolve(change,present){return typeof change==='function'?change(present):change;}
export function commitHistory(state,change){
  const next=resolve(change,state.present);
  if(next===state.present)return state;
  return {past:[...state.past.slice(-69),state.present],present:next,future:[]};
}
// Amend the current entry after the first frame of a continuous gesture.
// Drag motions form a single undoable operation, not hundreds of entries.
export function amendHistory(state,change){
  const next=resolve(change,state.present);
  return next===state.present?state:{...state,present:next};
}
export function undoHistory(state){
  if(!state.past.length)return state;
  return {past:state.past.slice(0,-1),
    present:state.past[state.past.length-1],
    future:[state.present,...state.future]};
}
export function redoHistory(state){
  if(!state.future.length)return state;
  return {past:[...state.past.slice(-69),state.present],
    present:state.future[0],future:state.future.slice(1)};
}
