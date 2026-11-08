import React,{useEffect,useRef,useState} from 'react';
import {inspectCharacterGlb,MAX_CHARACTER_GLB_BYTES} from './assetLabPreflight.js';
import {CHARACTER_FRAME_RATES,durationFrameCount,frameToSeconds,
  secondsToFrame} from './characterTimeline.js';
import {validatePoseEntry,makePosePack,readPosePack,MAX_NAMED_POSES,
  MAX_POSE_PACK_BYTES} from './characterPosePack.js';

// The Character Asset Lab remains independent of Framefield's editable JSON scene.
// Motion controls sample only the selected local GLB. No project mutation or upload.
export default function CharacterAssetLab({onClose}){
  const [candidate,setCandidate]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [ready,setReady]=useState(null);
  const [clipIndex,setClipIndex]=useState(0),[playing,setPlaying]=useState(false);
  const [fps,setFps]=useState(24),[frame,setFrame]=useState(0);
  const [loop,setLoop]=useState(true),[savingPng,setSavingPng]=useState(false);
  const [message,setMessage]=useState('');
  const [poseName,setPoseName]=useState(''),[savedPoses,setSavedPoses]=useState([]);
  const [morphValues,setMorphValues]=useState({});
  const canvasRef=useRef(null),viewer=useRef(null),fpsRef=useRef(24),secondsRef=useRef(0),
    clipIndexRef=useRef(0),clipDurationsRef=useRef([]);
  fpsRef.current=fps;
  useEffect(()=>{
    const escape=event=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',escape);
    return ()=>window.removeEventListener('keydown',escape);
  },[onClose]);
  async function chooseFile(event){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    viewer.current?.dispose();
    viewer.current=null;
    setCandidate(null);setReady(null);setPlaying(false);
    setClipIndex(0);setFrame(0);secondsRef.current=0;
    clipIndexRef.current=0;clipDurationsRef.current=[];
    setError('');setMessage('');
    setPoseName('');setSavedPoses([]);setMorphValues({});
    if(!file.name.toLowerCase().endsWith('.glb')||file.size>MAX_CHARACTER_GLB_BYTES||file.size<28){
      setError('Choose an embedded GLB file under 24 MiB. Editable import has separate limits.');
      return;
    }
    setBusy(true);
    try{
      const buffer=await file.arrayBuffer();
      const summary=inspectCharacterGlb(buffer);
      const digest=await crypto.subtle.digest('SHA-256',buffer);
      const sha256=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
      setCandidate({name:file.name,buffer,summary,sha256});
    }catch(err){setError(err.message||String(err));}
    finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!candidate)return;
    let cancelled=false,instance=null;
    (async()=>{
      try{
        const {createCharacterPreview}=await import('./characterAssetPreview.js');
        if(cancelled)return;
        instance=await createCharacterPreview(canvasRef.current,candidate.buffer,err=>{
          if(cancelled)return;
          viewer.current?.dispose();
          viewer.current=null;
          setReady(null);setPlaying(false);setError(err.message||String(err));
        },(seconds,active)=>{
          if(cancelled)return;
          secondsRef.current=seconds;
          setFrame(current=>{
            const duration=clipDurationsRef.current[clipIndexRef.current];
            const value=duration?secondsToFrame(seconds,duration,fpsRef.current):0;
            return current===value?current:value;
          });
          setPlaying(current=>current===active?current:active);
        });
        if(cancelled){instance.dispose();return;}
        viewer.current=instance;
        clipDurationsRef.current=instance.clips.map(clip=>clip.duration);
        clipIndexRef.current=0;
        instance.setLoop(loop);
        setReady({clips:instance.clips,stats:instance.stats,morphTargets:instance.morphTargets});
        setClipIndex(0);setFrame(0);setPlaying(false);
      }catch(err){if(!cancelled)setError(err.message||String(err));}
    })();
    return ()=>{
      cancelled=true;
      viewer.current=null;
      instance?.dispose();
    };
  },[candidate]);
  const selected=ready?.clips?.[clipIndex]||null;
  const maxFrame=selected?durationFrameCount(selected.duration,fps):0;
  function changeClip(value){
    const index=Number(value);
    clipIndexRef.current=index;
    viewer.current?.selectClip(index);
    secondsRef.current=0;
    setClipIndex(index);setFrame(0);setPlaying(false);setMessage('');
  }
  function togglePlayback(){
    const next=!playing;
    if(viewer.current?.setPlaying(next))setPlaying(next);
    else if(!next)setPlaying(false);
  }
  function changeFps(value){
    const next=Number(value);
    if(!CHARACTER_FRAME_RATES.includes(next))return;
    fpsRef.current=next;
    setFps(next);
    if(selected)setFrame(secondsToFrame(secondsRef.current,selected.duration,next));
  }
  function seekFrame(nextFrame){
    if(!selected||!viewer.current)return;
    const seconds=viewer.current.seekFrame(nextFrame,fps);
    secondsRef.current=seconds;
    setFrame(secondsToFrame(seconds,selected.duration,fps));
    setPlaying(false);
  }
  function toggleLoop(){
    const next=!loop;
    viewer.current?.setLoop(next);
    setLoop(next);
  }
  function poseContext(){
    return {durations:ready?.clips?.map(clip=>clip.duration)||[],
      morphIds:ready?.morphTargets?.map(target=>target.id)||[]};
  }
  function changeExpression(id,raw){
    try{
      const value=viewer.current?.setMorphWeight(id,raw);
      if(value===undefined)return;
      setMorphValues(previous=>({...previous,[id]:value}));
      setMessage('');
    }catch(err){setError(err.message||String(err));}
  }
  function resetExpressions(){
    viewer.current?.setMorphValues({});
    setMorphValues({});
    setMessage('Expression overrides cleared; source animation restored.');
  }
  function saveNamedPose(){
    if(!candidate||!ready||!viewer.current)return;
    setError('');setMessage('');
    try{
      const pose=validatePoseEntry({
        name:poseName,clipIndex:selected?clipIndex:-1,frame:selected?frame:0,
        fps,morphs:viewer.current.getMorphValues()
      },poseContext());
      makePosePack(candidate.sha256,[...savedPoses,pose],poseContext());
      setSavedPoses(current=>[...current,pose]);
      setPoseName('');
      setMessage('Named pose stored in this local session.');
    }catch(err){setError(err.message||String(err));}
  }
  function recallNamedPose(index){
    const pose=savedPoses[index];
    if(!pose||!viewer.current)return;
    try{
      fpsRef.current=pose.fps;
      clipIndexRef.current=pose.clipIndex;
      viewer.current.selectClip(pose.clipIndex);
      viewer.current.setMorphValues(pose.morphs);
      viewer.current.seekFrame(pose.frame,pose.fps);
      setFps(pose.fps);setClipIndex(Math.max(0,pose.clipIndex));
      setFrame(pose.frame);setPlaying(false);setMorphValues({...pose.morphs});
      setError('');setMessage('Recalled pose: '+pose.name);
    }catch(err){setError(err.message||String(err));}
  }
  function downloadPosePack(){
    if(!candidate||!ready||!savedPoses.length)return;
    try{
      const data=makePosePack(candidate.sha256,savedPoses,poseContext());
      const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;
      link.download=candidate.name.replace(/\\.glb$/i,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,55)+'-poses.json';
      document.body.append(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),3000);
      setError('');setMessage('Source-locked pose pack downloaded locally.');
    }catch(err){setError(err.message||String(err));}
  }
  async function uploadPosePack(event){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file||!candidate||!ready)return;
    try{
      if(file.size>MAX_POSE_PACK_BYTES)throw Error('Pose pack: file exceeds 64 KiB');
      const raw=JSON.parse(await file.text());
      const data=readPosePack(raw,candidate.sha256,poseContext());
      setSavedPoses(data.poses);
      setError('');setMessage('Loaded '+data.poses.length+' poses for this exact GLB.');
    }catch(err){setError('Pose pack import failed: '+(err.message||String(err)));}
  }
  async function capturePose(){
    if(!viewer.current||!selected||savingPng)return;
    setSavingPng(true);setError('');setMessage('');
    try{
      viewer.current.setPlaying(false);
      setPlaying(false);
      const blob=await viewer.current.capturePng();
      const href=URL.createObjectURL(blob);
      const link=document.createElement('a');
      const base=candidate.name.replace(/\.glb$/i,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,60)||'character';
      link.href=href;
      link.download=base+'-'+selected.name.replace(/[^a-z0-9_-]/gi,'-').slice(0,36)+
        '-f'+String(frame).padStart(5,'0')+'-'+fps+'fps.png';
      document.body.append(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(href),3000);
      setMessage('Local PNG pose saved. Original GLB and Framefield project unchanged.');
    }catch(err){setError('PNG pose capture failed: '+(err.message||String(err)));}
    finally{setSavingPng(false);}
  }
  return <div className="creator-overlay" data-testid="character-asset-lab">
    <section className="creator-dialog character-lab-dialog" role="dialog" aria-modal="true"
      aria-label="Character Asset Lab">
      <div className="creator-kicker">FRAMEFIELD / CHARACTER ACTING / PHASE 1E</div>
      <h2>Character Asset Lab</h2>
      <p>Preview a local textured or rigged GLB, scrub source clips, blend available
        facial morph targets, and save named pose bookmarks. Pose packs can be
        downloaded and reloaded for the <strong>same exact character GLB</strong>.
        This remains a <strong>read-only staging area</strong>, not the editable
        project importer or a ChipToons publishing pipeline.</p>
      <label className="character-lab-file">
        <span>Choose a local embedded .glb model (maximum 24 MiB)</span>
        <input type="file" accept=".glb,model/gltf-binary"
          aria-label="Choose character GLB for preview" onChange={chooseFile}/>
      </label>
      {busy&&<p role="status">Inspecting local GLB file…</p>}
      {error&&<p className="character-lab-error" role="alert">{error}</p>}
      {candidate&&<div className="character-lab-details">
        <strong>{candidate.name}</strong>
        <span>GLB SHA-256: {candidate.sha256.slice(0,16)}… (pose-pack source lock)</span>
        <span>{candidate.summary.meshes} mesh groups · {candidate.summary.vertices} vertices ·
          {' '}{candidate.summary.materials} materials · {candidate.summary.textures} textures</span>
        <span>{candidate.summary.skins} skins · {candidate.summary.animations} animation clips ·
          {' '}{candidate.summary.nodes} nodes</span>
      </div>}
      {candidate&&<div className="character-lab-stage">
        <canvas ref={canvasRef} aria-label="Character Asset Lab WebGL preview"
          data-testid="character-lab-canvas"/>
        {!ready&&!error&&<span className="character-lab-loading">Loading local character…</span>}
      </div>}
      {ready&&<div className="character-lab-details">
        <span>Rendered: {ready.stats.meshes} meshes · {ready.stats.bones} bone nodes
          · {ready.clips.length} playable actions</span>
        {ready.clips.length?
          <>
            <div className="character-lab-actions">
              <label>Animation clip
                <select aria-label="Character animation clip" value={clipIndex}
                  onChange={e=>changeClip(e.target.value)}>
                  {ready.clips.map(clip=><option key={clip.index} value={clip.index}>
                    {clip.name} ({clip.duration}s)</option>)}
                </select>
              </label>
              <button className="primary"
                aria-label={playing?'Pause character animation':'Play character animation'}
                onClick={togglePlayback}>{playing?'Pause':'Play'} animation</button>
              <label>Preview frame rate
                <select aria-label="Character preview frame rate" value={fps}
                  onChange={e=>changeFps(e.target.value)}>
                  {CHARACTER_FRAME_RATES.map(value=><option key={value} value={value}>
                    {value} FPS</option>)}
                </select>
              </label>
              <label className="character-lab-loop">
                <input type="checkbox" aria-label="Loop character animation"
                  checked={loop} onChange={toggleLoop}/> Loop
              </label>
            </div>
            <div className="character-lab-timeline">
              <label htmlFor="character-frame-scrub">Frame {frame} / {maxFrame}
                {' · '}{frameToSeconds(frame,selected.duration,fps).toFixed(3)} s
              </label>
              <input id="character-frame-scrub" type="range"
                aria-label="Character frame scrubber"
                min="0" max={maxFrame} step="1" value={Math.min(frame,maxFrame)}
                onChange={e=>seekFrame(Number(e.target.value))}/>
              <div className="character-lab-timeline-actions">
                <button onClick={()=>seekFrame(0)}>First frame</button>
                <button onClick={()=>seekFrame(Math.max(0,frame-1))}>Previous frame</button>
                <button onClick={()=>seekFrame(Math.min(maxFrame,frame+1))}>Next frame</button>
                <button onClick={()=>seekFrame(maxFrame)}>Last frame</button>
                <button className="primary" disabled={savingPng}
                  onClick={capturePose}>Export pose PNG</button>
              </div>
            </div>
          </>
          : <span>No source animation clips. Static preview available.</span>}
      </div>}
      {ready&&<>
        <div className="character-lab-details" aria-label="Facial expression controls">
          <strong>Expressions / Source morph targets</strong>
          {ready.morphTargets.length?
            <>
              <p className="creator-footnote">Adjust existing GLB blendshapes. No expression
                targets are invented when a model does not supply them.</p>
              {ready.morphTargets.map(target=><label key={target.id}
                className="character-expression-row">{target.label}
                <input aria-label={'Expression '+target.label} type="range"
                  min="0" max="1" step="0.05" value={morphValues[target.id]??0}
                  onChange={e=>changeExpression(target.id,Number(e.target.value))}/>
                <span>{Math.round((morphValues[target.id]??0)*100)}%</span>
              </label>)}
              <button className="ghost" onClick={resetExpressions}>Reset expressions</button>
            </>:
            <span>This model has no facial blendshapes or morph targets to adjust.</span>}
        </div>
        <div className="character-lab-details" aria-label="Named character poses">
          <strong>Named pose bookmarks (up to {MAX_NAMED_POSES})</strong>
          <div className="character-lab-pose-editor">
            <input type="text" maxLength="50" aria-label="Pose name"
              placeholder="e.g. Friendly wave" value={poseName}
              onChange={e=>setPoseName(e.target.value)}/>
            <button className="primary" onClick={saveNamedPose}
              disabled={savedPoses.length>=MAX_NAMED_POSES}>Save named pose</button>
          </div>
          {savedPoses.map((pose,index)=><div className="character-lab-pose-row"
            key={index}>
            <span>{pose.name} · {pose.clipIndex<0?'Static':'Clip '+(pose.clipIndex+1)}
              {' · '}F{pose.frame} / {pose.fps} FPS</span>
            <button aria-label={'Recall pose '+pose.name}
              onClick={()=>recallNamedPose(index)}>Recall</button>
            <button aria-label={'Delete pose '+pose.name}
              onClick={()=>setSavedPoses(current=>current.filter((_,i)=>i!==index))}>Delete</button>
          </div>)}
          <div className="character-lab-pose-editor">
            <button className="ghost" onClick={downloadPosePack}
              disabled={!savedPoses.length}>Download pose pack JSON</button>
            <label>Load pose pack JSON
              <input type="file" accept=".json,application/json"
                aria-label="Load pose pack JSON" onChange={uploadPosePack}/>
            </label>
          </div>
          <p className="creator-footnote">Bookmarks live in this tab until downloaded.
            Pose packs contain clip/frame/expression values, not model files.
            Import rejects packs for a different source GLB.</p>
        </div>
      </>}
      {message&&<p role="status" className="character-lab-message">{message}</p>}
      <p className="creator-footnote">Files remain in this browser. PNG stills are downloaded
        locally. Frame sampling is repeatable for a chosen clip, frame rate and camera,
        but is not synchronized with Framefield's main scene timeline. Named poses
        are stored only in this session or an explicitly downloaded JSON pack;
        character skeletons and source clips are not written to project JSON.
        Use assets you have permission to publish or redistribute.</p>
      <div className="creator-actions">
        <button className="ghost" onClick={onClose}>Close lab · return to editor</button>
      </div>
    </section>
  </div>;
}
