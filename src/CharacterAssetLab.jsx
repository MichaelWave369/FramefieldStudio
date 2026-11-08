import React,{useEffect,useRef,useState} from 'react';
import {inspectCharacterGlb,MAX_CHARACTER_GLB_BYTES} from './assetLabPreflight.js';
import {CHARACTER_FRAME_RATES,durationFrameCount,frameToSeconds,
  secondsToFrame} from './characterTimeline.js';

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
  const canvasRef=useRef(null),viewer=useRef(null),fpsRef=useRef(24),secondsRef=useRef(0);
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
    setError('');setMessage('');
    if(!file.name.toLowerCase().endsWith('.glb')||file.size>MAX_CHARACTER_GLB_BYTES||file.size<28){
      setError('Choose an embedded GLB file under 24 MiB. Editable import has separate limits.');
      return;
    }
    setBusy(true);
    try{
      const buffer=await file.arrayBuffer();
      const summary=inspectCharacterGlb(buffer);
      setCandidate({name:file.name,buffer,summary});
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
            const value=Math.round(seconds*fpsRef.current);
            return current===value?current:value;
          });
          setPlaying(current=>current===active?current:active);
        });
        if(cancelled){instance.dispose();return;}
        viewer.current=instance;
        instance.setLoop(loop);
        setReady({clips:instance.clips,stats:instance.stats});
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
      <div className="creator-kicker">FRAMEFIELD / CHARACTER MOTION STUDIO / PHASE 1D</div>
      <h2>Character Asset Lab</h2>
      <p>Preview textured and rigged GLB 2.0 characters. Pick a source clip, inspect
        repeatable poses at 24 or 30 FPS, and export a local PNG reference.
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
      {message&&<p role="status" className="character-lab-message">{message}</p>}
      <p className="creator-footnote">Files remain in this browser. PNG stills are downloaded
        locally. Frame sampling is repeatable for a chosen clip, frame rate and camera,
        but is not synchronized with Framefield's main scene timeline. Character models,
        skeletons and source clips are not written to project JSON.
        Use assets you have permission to publish or redistribute.</p>
      <div className="creator-actions">
        <button className="ghost" onClick={onClose}>Close lab · return to editor</button>
      </div>
    </section>
  </div>;
}
