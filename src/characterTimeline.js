// Deterministic, read-only time controls for Character Motion Studio.
// Independent of Framefield's editable project timeline. SPDX-License-Identifier: MIT
export const CHARACTER_FRAME_RATES=Object.freeze([24,30]);
export const MAX_CLIP_SECONDS=300;
export function durationFrameCount(duration,fps){
  if(!CHARACTER_FRAME_RATES.includes(fps))throw Error('Character timeline: FPS must be 24 or 30');
  if(typeof duration!=='number'||!Number.isFinite(duration)||duration<=0||duration>MAX_CLIP_SECONDS)
    throw Error('Character timeline: clip duration must be within 0–300 seconds');
  return Math.max(1,Math.ceil(duration*fps));
}
export function clampCharacterFrame(frame,duration,fps){
  const max=durationFrameCount(duration,fps);
  const value=Number(frame);
  if(!Number.isFinite(value))return 0;
  return Math.min(max,Math.max(0,Math.round(value)));
}
export function frameToSeconds(frame,duration,fps){
  const count=durationFrameCount(duration,fps);
  const f=clampCharacterFrame(frame,duration,fps);
  return f===count?duration:Math.min(duration,f/fps);
}
export function secondsToFrame(seconds,duration,fps){
  const value=Number(seconds);
  if(Number.isFinite(value)&&value>=duration)return durationFrameCount(duration,fps);
  return clampCharacterFrame(Number.isFinite(value)?value*fps:0,duration,fps);
}
export function advanceCharacterTime(current,delta,duration,loop=true){
  if(!Number.isFinite(current)||!Number.isFinite(delta)||
    !Number.isFinite(duration)||duration<=0)throw Error('Character timeline: invalid playback time');
  const next=Math.max(0,current)+Math.max(0,delta);
  if(next<duration)return {seconds:next,playing:true};
  if(loop)return {seconds:next%duration,playing:true};
  return {seconds:duration,playing:false};
}
