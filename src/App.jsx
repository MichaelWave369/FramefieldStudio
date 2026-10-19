import React, {useEffect,useMemo,useRef,useState} from 'react';
import {atFrame,clamp,demoScene,id,makeObject,pose,putKey,TYPES,validateProject} from './scene.js';
import {render} from './renderer.js';
import './style.css';

const icon={box:'⬡',sphere:'◉',pyramid:'△',cylinder:'▥',torus:'◎'};
const axis=['X','Y','Z'];
const cameraInitial=()=>({yaw:.66,pitch:.32,distance:9.3,target:[0,0,0]});
function saveBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
const filename=name=>(name||'framefield').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'')||'framefield';

export default function App(){
  const [scene,setScene]=useState(demoScene);
  const [selectedId,setSelectedId]=useState(()=>null);
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [camera,setCamera]=useState(cameraInitial);
  const [shape,setShape]=useState('box');
  const [status,setStatus]=useState('Ready to animate.');
  const [recording,setRecording]=useState(false);
  const canvasRef=useRef(null),picker=useRef([]),drag=useRef(null),fileRef=useRef(null),recorder=useRef(null);
  const selected=useMemo(()=>scene.objects.find(o=>o.id===selectedId)||null,[scene,selectedId]);
  const selectedPose=selected?atFrame(selected,frame):null;
  const [sizeVersion,setSizeVersion]=useState(0);
  useEffect(()=>{
    if(!selectedId && scene.objects.length)setSelectedId(scene.objects[0].id);
  },[selectedId,scene.objects]);
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;
    const obs=new ResizeObserver(()=>setSizeVersion(v=>v+1));
    obs.observe(cv);return ()=>obs.disconnect();
  },[]);
  useEffect(()=>{
    picker.current=render(canvasRef.current,scene,frame,camera,selectedId);
  },[scene,frame,camera,selectedId,sizeVersion]);
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;
    const handle=e=>{e.preventDefault();setCamera(c=>({...c,distance:clamp(c.distance*Math.exp(e.deltaY*.001),2,70)}));};
    cv.addEventListener('wheel',handle,{passive:false});return ()=>cv.removeEventListener('wheel',handle);
  },[]);
  useEffect(()=>{
    if(!playing)return;
    let raf,last=0,progress=frame;
    const tick=stamp=>{
      if(!last)last=stamp;
      progress+=Math.min(.15,(stamp-last)/1000)*scene.fps;last=stamp;
      if(progress>=scene.duration){setFrame(scene.duration);setPlaying(false);return;}
      setFrame(Math.floor(progress));
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing,scene.fps,scene.duration]);
  useEffect(()=>{
    const handle=e=>{
      if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;
      if(e.code==='Space'){e.preventDefault();setPlaying(p=>!p);}
      if(e.key.toLowerCase()==='k' && selectedId){e.preventDefault();addKey();}
      if(e.key==='Delete' && selectedId){e.preventDefault();deleteSelected();}
    };
    window.addEventListener('keydown',handle);return ()=>window.removeEventListener('keydown',handle);
  });
  function withObject(fn){if(!selected)return;setScene(s=>({...s,objects:s.objects.map(o=>o.id===selectedId?fn(o):o)}));}
  function editVector(group,i,value){
    const num=Number(value);if(!Number.isFinite(num))return;
    withObject(o=>{const p=atFrame(o,frame);p[group][i]=clamp(num,-10000,10000);return putKey(o,frame,p);});
    setStatus('Transform keyframe stored · F'+frame);
  }
  function addKey(){
    if(!selected)return;withObject(o=>putKey(o,frame,atFrame(o,frame)));
    setStatus('Keyframe added at F'+frame);
  }
  function removeKey(){
    withObject(o=>o.keyframes.length>1?{...o,keyframes:o.keyframes.filter(k=>k.frame!==frame)}:o);
  }
  function addShape(){
    if(scene.objects.length>=100){setStatus('Scene limit: 100 objects.');return;}
    const o=makeObject(shape,scene.objects.length,frame);
    setScene(s=>({...s,objects:[...s.objects,o]}));setSelectedId(o.id);setStatus('Added '+o.name);
  }
  function deleteSelected(){
    if(!selectedId)return;
    const remaining=scene.objects.filter(o=>o.id!==selectedId);
    setScene(s=>({...s,objects:remaining}));setSelectedId(remaining[0]?.id||null);
    setStatus('Object deleted');
  }
  function duplicate(){
    if(!selected || scene.objects.length>=100)return;
    const o={...selected,id:id(),name:selected.name+' Copy',keyframes:selected.keyframes.map(k=>({
      ...k,position:[k.position[0]+.5,k.position[1],k.position[2]+.5],
      rotation:[...k.rotation],scale:[...k.scale] }))};
    setScene(s=>({...s,objects:[...s.objects,o]}));setSelectedId(o.id);
    setStatus('Object duplicated');
  }
  function seek(next){setPlaying(false);setFrame(clamp(Math.round(next),0,scene.duration));}
  function newProject(){
    if(recording)stopRecording();
    setPlaying(false);setScene({version:1,name:'Untitled Motion',fps:24,duration:120,objects:[]});
    setSelectedId(null);setFrame(0);setStatus('New empty project');
  }
  function save(){
    saveBlob(new Blob([JSON.stringify(scene,null,2)],{type:'application/json'}),filename(scene.name)+'.framefield.json');
    setStatus('Project JSON downloaded');
  }
  async function openFile(e){
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    try{
      if(file.size>3000000)throw Error('File exceeds 3 MB');
      const imported=validateProject(JSON.parse(await file.text()));
      setPlaying(false);setScene(imported);setSelectedId(imported.objects[0]?.id||null);
      setFrame(0);setStatus('Opened '+imported.name);
    }catch(err){setStatus('Import failed: '+err.message);}
  }
  function snapshot(){
    const canvas=canvasRef.current;if(!canvas)return;
    render(canvas,scene,frame,camera,selectedId);
    canvas.toBlob(b=>{if(b)saveBlob(b,filename(scene.name)+'-f'+frame+'.png');},'image/png');
    setStatus('Snapshot PNG exported');
  }
  function stopRecording(){
    setPlaying(false);
    if(recorder.current?.state==='recording')recorder.current.stop();
  }
  function record(){
    if(recording){stopRecording();return;}
    const canvas=canvasRef.current;
    if(!canvas?.captureStream||!window.MediaRecorder){setStatus('WebM recording is not supported in this browser.');return;}
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
      .find(s=>MediaRecorder.isTypeSupported(s));
    if(!mime){setStatus('No supported WebM encoder was found.');return;}
    try{
      const stream=canvas.captureStream(30),chunks=[];
      const r=new MediaRecorder(stream,{mimeType:mime});
      recorder.current=r;
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      r.onstop=()=>{
        if(chunks.length)saveBlob(new Blob(chunks,{type:mime}),filename(scene.name)+'.webm');
        stream.getTracks().forEach(t=>t.stop());setRecording(false);setStatus('WebM recording finished');
      };
      r.onerror=()=>{setRecording(false);setStatus('Recording failed');};
      r.start();setFrame(0);setPlaying(true);setRecording(true);setStatus('Recording animation...');
    }catch(err){setStatus('Record failed: '+err.message);}
  }
  useEffect(()=>{
    if(recording && !playing && frame===scene.duration)stopRecording();
  },[frame,playing,recording,scene.duration]);
  function pointerDown(e){
    if(e.button>2)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,pan:e.shiftKey||e.button===2};
  }
  function pointerMove(e){
    const d=drag.current;if(!d)return;
    const dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;
    setCamera(c=>{
      if(!d.pan)return {...c,yaw:c.yaw-dx*.008,pitch:clamp(c.pitch+dy*.008,-1.42,1.42)};
      const yaw=c.yaw,rate=c.distance*.0015;
      return {...c,target:[
        c.target[0]-Math.cos(yaw)*dx*rate,
        c.target[1]+dy*rate,
        c.target[2]+Math.sin(yaw)*dx*rate ]};
    });
  }
  function pointerUp(e){
    const d=drag.current;if(!d)return;
    if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<5){
      const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      const hit=picker.current.reduce((best,p)=>{
        const dist=Math.hypot(x-p.x,y-p.y);
        return dist<best.distance?{id:p.id,distance:dist}:best;
      },{id:null,distance:55});
      if(hit.id)setSelectedId(hit.id);
    }
    drag.current=null;
  }
  const durationUpdate=value=>{
    const n=clamp(Math.round(Number(value)||120),12,600);
    setScene(s=>({...s,duration:n,objects:s.objects.map(o=>{
      const keys=o.keyframes.filter(k=>k.frame<=n);
      return {...o,keyframes:keys.length?keys:[{frame:0,...pose()}]};
    })}));seek(Math.min(frame,n));
  };
  function timelineClick(e){
    const r=e.currentTarget.getBoundingClientRect();
    seek((e.clientX-r.left)/r.width*scene.duration);
  }
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="mark">F<span>✦</span></div><div><strong>FRAMEFIELD</strong><small>STUDIO / React alpha 0.1</small></div></div>
      <div className="project-meta"><input aria-label="Project name" value={scene.name}
        onChange={e=>setScene(s=>({...s,name:e.target.value.slice(0,80)}))}/>
        <span className="pill"><span className="live-dot"/> ORIGINAL ENGINE</span></div>
      <div className="top-actions">
        <button className="ghost" onClick={newProject}>New</button>
        <button className="ghost" onClick={()=>fileRef.current?.click()}>Open JSON</button>
        <button className="ghost" onClick={save}>Save JSON</button>
        <button className="ghost" onClick={snapshot}>Snapshot PNG</button>
        <button className="primary" onClick={record}>{recording?'■ Stop recording':'● Record WebM'}</button>
        <input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={openFile}/>
      </div>
    </header>
    <main className="workspace">
      <aside className="sidebar left">
        <div className="section-heading"><span>SCENE COLLECTION</span><span>{scene.objects.length} objects</span></div>
        <div className="add-controls">
          <select aria-label="Shape" value={shape} onChange={e=>setShape(e.target.value)}>
            {TYPES.map(t=><option key={t} value={t}>{t==='box'?'Cube':t[0].toUpperCase()+t.slice(1)}</option>)}
          </select><button onClick={addShape}>+ Add</button>
        </div>
        <div className="scene-list" role="listbox" aria-label="Scene objects">
          {scene.objects.map(o=><button role="option" aria-selected={selectedId===o.id}
            className={'scene-object '+(selectedId===o.id?'active':'')} key={o.id}
            onClick={()=>setSelectedId(o.id)}>
            <span className="shape-icon">{icon[o.type]}</span><span className="scene-name">{o.name}</span>
            {!o.visible && <span className="muted">Hidden</span>}
          </button>)}
          {!scene.objects.length && <p className="muted help">Your scene is empty. Add a shape to begin.</p>}
        </div>
        <div className="left-footer">
          <button className="full ghost" disabled={!selected} onClick={duplicate}>Duplicate selected</button>
          <button className="full ghost danger" disabled={!selected} onClick={deleteSelected}>Delete selected</button>
        </div>
        <div className="hints"><div className="section-heading">VIEW CONTROLS</div>
          <p><kbd>Drag</kbd> Orbit camera</p><p><kbd>Shift</kbd> + <kbd>Drag</kbd> Pan</p>
          <p><kbd>Scroll</kbd> Zoom</p><p><kbd>Click</kbd> Select object</p>
          <p><kbd>Space</kbd> Play / pause</p><p><kbd>K</kbd> Add keyframe</p>
        </div>
      </aside>
      <section className="viewport-panel" aria-label="3D viewport">
        <div className="view-top"><div><span className="view-tag">PERSPECTIVE</span>
          <span>World / Frame {String(frame).padStart(3,'0')}</span></div>
          <button className="ghost small" onClick={()=>setCamera(cameraInitial())}>Reset camera</button>
        </div>
        <canvas ref={canvasRef} aria-label="Interactive 3D viewport"
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={()=>drag.current=null} onContextMenu={e=>e.preventDefault()}/>
        <div className="axis-compass" aria-hidden="true"><span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span></div>
        <div className="view-bottom"><span>Original software 3D renderer · no external assets</span>
          <span>Orbit · {camera.distance.toFixed(1)}m</span></div>
      </section>
      <aside className="sidebar right">
        <div className="section-heading">INSPECTOR <span>F{String(frame).padStart(3,'0')}</span></div>
        {!selected ? <p className="empty">Select a shape in the scene or viewport.</p> :
        <div className="inspector">
          <label className="field-label" htmlFor="objectName">OBJECT NAME</label>
          <input id="objectName" className="object-name" value={selected.name}
            onChange={e=>withObject(o=>({...o,name:e.target.value.slice(0,65)}))}/>
          <label className="field-label" htmlFor="objectColor">MATERIAL COLOR</label>
          <div className="color-row">
            <input id="objectColor" type="color" value={selected.color}
              onChange={e=>withObject(o=>({...o,color:e.target.value}))}/>
            <span>{selected.color}</span>
            <button className="ghost small" onClick={()=>withObject(o=>({...o,visible:!o.visible}))}>
              {selected.visible?'Visible':'Hidden'}</button>
          </div>
          {['position','rotation','scale'].map(group=><div key={group}>
            <div className="transform-title">{group.toUpperCase()} <span>{group==='position'?'METERS':group==='rotation'?'DEGREES':'FACTOR'}</span></div>
            <div className="vector-fields">{axis.map((a,i)=><label className="vec-row" key={a}>
              <span className={'axis-label '+a.toLowerCase()}>{a}</span>
              <input aria-label={group+' '+a} type="number" step={group==='rotation'?1:.1}
                value={Number(selectedPose[group][i].toFixed(3))}
                onChange={e=>editVector(group,i,e.target.value)}/>
            </label>)}</div>
          </div>)}
          <div className="key-card"><div className="key-title">ANIMATION KEYFRAMES</div>
            <p>Transform changes store a keyframe at the current frame. Values interpolate between keys.</p>
            <button className="full primary" onClick={addKey}>◆ Add / update keyframe</button>
            <button className="full ghost" onClick={removeKey}>Remove current keyframe</button>
            <div className="key-summary">{selected.keyframes.length} keyframes · {selected.keyframes.some(k=>k.frame===frame)?'Key exists here':'Interpolated frame'}</div>
          </div>
        </div>}
      </aside>
    </main>
    <section className="timeline-section" aria-label="Animation timeline">
      <div className="timeline-bar">
        <div className="timeline-title"><strong>DOPE SHEET</strong><span>KEYFRAME TIMELINE</span></div>
        <div className="transport">
          <button aria-label="First frame" onClick={()=>seek(0)}>⏮</button>
          <button aria-label="Previous frame" onClick={()=>seek(frame-1)}>‹</button>
          <button className="play" aria-label={playing?'Pause':'Play'} onClick={()=>{if(frame>=scene.duration)setFrame(0);setPlaying(p=>!p);}}>{playing?'Ⅱ':'▶'}</button>
          <button aria-label="Next frame" onClick={()=>seek(frame+1)}>›</button>
          <button aria-label="Last frame" onClick={()=>seek(scene.duration)}>⏭</button>
        </div>
        <div className="time-settings">
          <label>FRAME <input type="number" min="0" max={scene.duration} value={frame} onChange={e=>seek(Number(e.target.value)||0)}/></label>
          <label>FPS <select value={scene.fps} onChange={e=>setScene(s=>({...s,fps:Number(e.target.value)}))}>
            {[12,24,30,60].map(n=><option key={n}>{n}</option>)}</select></label>
          <label>END <input type="number" min="12" max="600" value={scene.duration} onChange={e=>durationUpdate(e.target.value)}/></label>
        </div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-ruler"><div className="track-label">OBJECT / FRAME</div>
          <div className="ruler-range" onClick={timelineClick}>
            {[0,.25,.5,.75,1].map(f=><span key={f} style={{left:(f*100)+'%'}}>{Math.round(scene.duration*f)}</span>)}
          </div>
        </div>
        {scene.objects.map(o=><div className={'timeline-row '+(o.id===selectedId?'active':'')} key={o.id}>
          <button className="track-label" onClick={()=>setSelectedId(o.id)}>{icon[o.type]} {o.name}</button>
          <div className="track-range" onClick={timelineClick}>
            {o.keyframes.map(k=><button key={k.frame} className="keyframe"
              aria-label={o.name+' keyframe '+k.frame} title={'Frame '+k.frame}
              style={{left:(k.frame/scene.duration*100)+'%'}}
              onClick={e=>{e.stopPropagation();setSelectedId(o.id);seek(k.frame);}}>◆</button>)}
          </div>
        </div>)}
        <div className="playhead-track"><div className="track-label"/>
          <div className="playhead-range"><div className="playhead" style={{left:(frame/scene.duration*100)+'%'}}/></div>
        </div>
      </div>
    </section>
    <footer><span>Framefield Studio <span className="muted">· original MIT source · projects stay on your device</span></span>
      <span className="status" role="status" aria-live="polite">{status}</span></footer>
  </div>;
}
