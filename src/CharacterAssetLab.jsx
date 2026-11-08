import React,{useEffect,useRef,useState} from 'react';
import {inspectCharacterGlb,MAX_CHARACTER_GLB_BYTES} from './assetLabPreflight.js';

// The Character Asset Lab is independent of Framefield's editable JSON scene.
// Previewing a model never inserts an object, uploads bytes, or changes Undo.
export default function CharacterAssetLab({onClose}){
  const [candidate,setCandidate]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [ready,setReady]=useState(null);
  const [clipIndex,setClipIndex]=useState(0),[playing,setPlaying]=useState(false);
  const canvasRef=useRef(null),viewer=useRef(null);
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
    setCandidate(null);setReady(null);setPlaying(false);setClipIndex(0);setError('');
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
        });
        if(cancelled){instance.dispose();return;}
        viewer.current=instance;
        setReady({clips:instance.clips,stats:instance.stats});
        setClipIndex(0);setPlaying(false);
      }catch(err){if(!cancelled)setError(err.message||String(err));}
    })();
    return ()=>{
      cancelled=true;
      viewer.current=null;
      instance?.dispose();
    };
  },[candidate]);
  function changeClip(value){
    const index=Number(value);
    viewer.current?.selectClip(index);
    setClipIndex(index);setPlaying(false);
  }
  function togglePlayback(){
    const next=!playing;
    if(viewer.current?.setPlaying(next))setPlaying(next);
  }
  return <div className="creator-overlay" data-testid="character-asset-lab">
    <section className="creator-dialog character-lab-dialog" role="dialog" aria-modal="true"
      aria-label="Character Asset Lab">
      <div className="creator-kicker">FRAMEFIELD / LOCAL CHARACTER ASSETS / PHASE 1C</div>
      <h2>Character Asset Lab</h2>
      <p>Preview textured and rigged GLB 2.0 characters, inspect their animation clips,
        and play an action. This is a <strong>read-only staging area</strong>, not the
        editable project importer or a verified ChipToons export.</p>
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
          <div className="character-lab-actions">
            <label>Animation clip
              <select aria-label="Character animation clip" value={clipIndex}
                onChange={e=>changeClip(e.target.value)}>
                {ready.clips.map(clip=><option key={clip.index} value={clip.index}>
                  {clip.name} ({clip.duration}s)</option>)}
              </select>
            </label>
            <button className="primary" aria-label={playing?'Pause character animation':'Play character animation'}
              onClick={togglePlayback}>{playing?'Pause':'Play'} animation</button>
          </div>
          : <span>No source animation clips. Static preview available.</span>}
      </div>}
      <p className="creator-footnote">Files are parsed in this browser only. Only embedded
        PNG/JPEG textures are accepted, with no external asset URLs. Materials, bones and
        animation clips are previewed but not saved into Framefield JSON yet.
        Original file rights and redistribution permissions remain the artist's responsibility.</p>
      <div className="creator-actions">
        <button className="ghost" onClick={onClose}>Close lab · return to editor</button>
      </div>
    </section>
  </div>;
}
