// Framefield Character Lab pose bookmarks: local, source-locked and versioned.
// No editing or serialization of the existing Framefield scene. SPDX-License-Identifier: MIT
import {CHARACTER_FRAME_RATES,durationFrameCount} from './characterTimeline.js';

export const POSE_PACK_FORMAT='framefield-character-pose-pack';
export const POSE_PACK_VERSION=1;
export const MAX_NAMED_POSES=16;
export const MAX_MORPH_CONTROLS=64;
export const MAX_POSE_PACK_BYTES=64*1024;
const SHA256=/^[0-9a-f]{64}$/;

export function clampMorphWeight(value){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(0,Math.min(1,number)):0;
}

export function validatePoseEntry(raw,{durations,morphIds}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))
    throw Error('Pose pack: invalid pose entry');
  const name=String(raw.name??'').trim();
  if(!name||name.length>50||/[\u0000-\u001f\u007f]/.test(name))
    throw Error('Pose pack: pose names must be 1–50 printable characters');
  const clipIndex=raw.clipIndex;
  if(!Number.isInteger(clipIndex)||clipIndex< -1||clipIndex>=durations.length||
    (durations.length>0&&clipIndex===-1))
    throw Error('Pose pack: unavailable animation clip');
  if(!CHARACTER_FRAME_RATES.includes(raw.fps))
    throw Error('Pose pack: unsupported FPS');
  const limit=clipIndex===-1?0:durationFrameCount(durations[clipIndex],raw.fps);
  if(!Number.isInteger(raw.frame)||raw.frame<0||raw.frame>limit)
    throw Error('Pose pack: frame outside clip');
  if(!raw.morphs||typeof raw.morphs!=='object'||Array.isArray(raw.morphs))
    throw Error('Pose pack: invalid expression values');
  const entries=Object.entries(raw.morphs);
  if(entries.length>MAX_MORPH_CONTROLS)throw Error('Pose pack: too many expression values');
  const available=new Set(morphIds);
  const morphs={};
  for(const [id,weight] of entries){
    if(!/^\d+:\d+$/.test(id)||!available.has(id)||typeof weight!=='number'||
      !Number.isFinite(weight)||weight<0||weight>1)
      throw Error('Pose pack: invalid or unavailable expression target');
    morphs[id]=weight;
  }
  return {name,clipIndex,frame:raw.frame,fps:raw.fps,morphs};
}

export function makePosePack(sourceSha256,poses,context){
  if(typeof sourceSha256!=='string'||!SHA256.test(sourceSha256))
    throw Error('Pose pack: invalid asset fingerprint');
  if(!Array.isArray(poses)||poses.length>MAX_NAMED_POSES)
    throw Error('Pose pack: too many poses');
  const named=new Set();
  const clean=poses.map(item=>{
    const value=validatePoseEntry(item,context);
    const key=value.name.toLowerCase();
    if(named.has(key))throw Error('Pose pack: duplicate pose name');
    named.add(key);
    return value;
  });
  return {format:POSE_PACK_FORMAT,version:POSE_PACK_VERSION,sourceSha256,poses:clean};
}

export function readPosePack(raw,sourceSha256,context){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     raw.format!==POSE_PACK_FORMAT||raw.version!==POSE_PACK_VERSION)
    throw Error('Pose pack: unsupported format or version');
  if(raw.sourceSha256!==sourceSha256)
    throw Error('Pose pack: this file belongs to a different GLB character');
  return makePosePack(sourceSha256,raw.poses,context);
}
