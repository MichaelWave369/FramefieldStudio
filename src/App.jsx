import React, {useEffect,useMemo,useRef,useState} from 'react';
import {atFrame,clamp,demoScene,id,makeObject,pose,putKey,TYPES,validateProject,setChannelCurve,setChannelKeyValue} from './scene.js';
import GraphEditor from './GraphEditor.jsx';
import {MaterialEditor,LightingEditor} from './MaterialLighting.jsx';
import RenderStudio from './RenderStudio.jsx';
import MeshWorkshop from './MeshWorkshop.jsx';
import ModifierStack from './ModifierStack.jsx';
import {RecoveryPrompt,StarterPicker} from './CreatorDialogs.jsx';
import {readRecovery,storeDraft,clearRecovery} from './recovery.js';
import {createStarter} from './starterScenes.js';
import {pickSurface} from './picking.js';
import {sanitizeModifiers,evaluateModifiers} from './modifiers.js';
import {operateFace} from './faceOps.js';
import {cloneMesh,primitiveMesh,moveMeshComponent,dragToLocal,pickComponent} from './mesh.js';
import {DEFAULT_SHOT_CAMERA,DEFAULT_RENDER,sanitizeShotCamera,sanitizeRender,frameRange} from './shot.js';
import {makeZip} from './zip.js';
import {DEFAULT_LIGHTING,sanitizeLighting,sanitizeMaterial} from './lighting.js';
import {render} from './renderer.js';
import {initialHistory,commitHistory,amendHistory,undoHistory,redoHistory} from './history.js';
import {hitMoveHandle,axisDragWorldDelta,hitRotateHandle,screenRotationDelta,scaledAxisValue} from './gizmo.js';
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
  const [history,setHistory]=useState(()=>initialHistory(demoScene()));
  const [recovery,setRecovery]=useState(()=>readRecovery(window.localStorage));
  const [starterOpen,setStarterOpen]=useState(false);
  const [autosaveEnabled,setAutosaveEnabled]=useState(false);
  const [autosaveState,setAutosaveState]=useState({kind:'idle'});
  const scene=history.present;
  const setScene=change=>setHistory(h=>commitHistory(h,change));
  const amendScene=change=>setHistory(h=>amendHistory(h,change));
  const undo=()=>{setPlaying(false);setHistory(undoHistory);setStatus('Undo');};
  const redo=()=>{setPlaying(false);setHistory(redoHistory);setStatus('Redo');};
  const [selectedId,setSelectedId]=useState(()=>null);
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [camera,setCamera]=useState(cameraInitial);
  const [shape,setShape]=useState('box');
  const [tool,setTool]=useState('move');
  const [meshMode,setMeshMode]=useState('object');
  const [meshSelection,setMeshSelection]=useState(0);
  const meshHits=useRef([]);
  const [timelineMode,setTimelineMode]=useState('dope');
  const [graphChannel,setGraphChannel]=useState('position.0');
  const [inspectorTab,setInspectorTab]=useState('object');
  const [previewShot,setPreviewShot]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [exportProgress,setExportProgress]=useState('');
  const cancelExport=useRef(false);
  const [status,setStatus]=useState('Ready to animate.');
  const [recording,setRecording]=useState(false);
  const canvasRef=useRef(null),picker=useRef([]),pickFaces=useRef([]),
    handles=useRef([]),drag=useRef(null),fileRef=useRef(null),recorder=useRef(null);
  const selected=useMemo(()=>scene.objects.find(o=>o.id===selectedId)||null,[scene,selectedId]);
  const selectedPose=selected?atFrame(selected,frame):null;
  const [sizeVersion,setSizeVersion]=useState(0);
  useEffect(()=>{
    if(selectedId && scene.objects.some(o=>o.id===selectedId))return;
    setSelectedId(scene.objects[0]?.id||null);
    setMeshMode('object');setMeshSelection(0);
  },[selectedId,scene.objects]);
  useEffect(()=>{
    if(!recovery&&history.past.length>0)setAutosaveEnabled(true);
  },[recovery,history.past.length]);
  useEffect(()=>{
    if(recovery||!autosaveEnabled)return;
    setAutosaveState({kind:'pending'});
    const timer=window.setTimeout(()=>{
      try{
        const result=storeDraft(window.localStorage,scene);
        setAutosaveState({kind:'saved',at:result.savedAt});
      }catch(error){setAutosaveState({kind:'error',message:error.message});}
    },800);
    return ()=>window.clearTimeout(timer);
  },[scene,recovery,autosaveEnabled]);
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;
    const obs=new ResizeObserver(()=>setSizeVersion(v=>v+1));
    obs.observe(cv);return ()=>obs.disconnect();
  },[]);
  useEffect(()=>{
    const settings=sanitizeRender(scene.renderSettings);
    const view=render(canvasRef.current,scene,frame,
      previewShot?sanitizeShotCamera(scene.shotCamera):camera,
      previewShot?null:selectedId,previewShot?'orbit':tool,
      previewShot?{helpers:false,aspect:settings.width/settings.height}:
        {meshMode:meshMode==='object'?null:meshMode,componentSelection:meshSelection});
    picker.current=view.pick;
    pickFaces.current=view.faces||[];
    handles.current=view.handles;
    meshHits.current=view.components||[];
  },[scene,frame,camera,selectedId,tool,previewShot,meshMode,meshSelection,sizeVersion]);
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;
    const handle=e=>{e.preventDefault();if(previewShot)return;
      setCamera(c=>({...c,distance:clamp(c.distance*Math.exp(e.deltaY*.001),2,70)}));};
    cv.addEventListener('wheel',handle,{passive:false});return ()=>cv.removeEventListener('wheel',handle);
  },[previewShot]);
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
      if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||
        document.activeElement?.isContentEditable)return;
      const mod=e.ctrlKey||e.metaKey;
      if(mod && !e.altKey && e.key.toLowerCase()==='z'){
        e.preventDefault();if(e.shiftKey)redo();else undo();return;
      }
      if(mod && !e.altKey && e.key.toLowerCase()==='y'){
        e.preventDefault();redo();return;
      }
      if(e.altKey||mod)return;
      if(e.code==='Space'){e.preventDefault();setPlaying(p=>!p);}
      if(e.key.toLowerCase()==='k' && selectedId){e.preventDefault();addKey();}
      if(meshMode!=='object'){
        if(['v','e','f'].includes(e.key.toLowerCase())){
          const choices={v:'vertex',e:'edge',f:'face'};
          setMeshMode(choices[e.key.toLowerCase()]);setMeshSelection(0);return;
        }
        if(e.key==='Escape'){setMeshMode('object');return;}
        return;
      }
      if(e.key.toLowerCase()==='g'){setTool('move');}
      if(e.key.toLowerCase()==='r'){setTool('rotate');}
      if(e.key.toLowerCase()==='s'){setTool('scale');}
      if(e.key.toLowerCase()==='o'){setTool('orbit');}
      if(e.key==='Delete' && selectedId){e.preventDefault();deleteSelected();}
    };
    window.addEventListener('keydown',handle);return ()=>window.removeEventListener('keydown',handle);
  });
  function withObject(fn){if(!selected)return;setScene(s=>({...s,objects:s.objects.map(o=>o.id===selectedId?fn(o):o)}));}
  function updateMaterial(patch){
    withObject(o=>({...o,material:sanitizeMaterial({...sanitizeMaterial(o.material),...patch})}));
    setStatus('Updated surface material');
  }
  function updateLighting(patch){
    setScene(s=>{
      if(patch.__reset)return {...s,lighting:sanitizeLighting(DEFAULT_LIGHTING)};
      const before=sanitizeLighting(s.lighting);
      const next={...before,...patch};
      for(const type of ['key','fill']){
        if(patch[type])next[type]={...before[type],...patch[type]};
      }
      return {...s,lighting:sanitizeLighting(next)};
    });
    setStatus(patch.__reset?'Lighting reset':'Updated scene lighting');
  }
  function updateShotCamera(next){
    setScene(s=>({...s,shotCamera:sanitizeShotCamera(next)}));
    setStatus('Shot camera updated');
  }
  function updateRenderSettings(next){
    setScene(s=>({...s,renderSettings:sanitizeRender(next)}));
    setStatus('Render settings updated');
  }
  function captureShot(){
    updateShotCamera(camera);
    setPreviewShot(true);
    setStatus('Saved shot from editor view');
  }
  function updateModifiers(next){
    if(!selected)return;
    try{
      const modifiers=sanitizeModifiers(next);
      // Preflight geometry so a huge subdivision fails in the inspector, not the renderer.
      evaluateModifiers({...selected,modifiers});
      withObject(o=>({...o,modifiers}));
      setStatus('Modifier stack updated · Undo available');
    }catch(error){setStatus('Modifier not applied: '+error.message);}
  }
  function convertToMesh(){
    if(!selected||selected.geometry)return;
    withObject(o=>({...o,geometry:cloneMesh(primitiveMesh(o.type))}));
    setMeshMode('vertex');setMeshSelection(0);setPlaying(false);
    setStatus('Converted '+selected.name+' to editable mesh');
  }
  function setEditMode(next){
    setMeshMode(next);setMeshSelection(0);
    if(next!=='object'){setPlaying(false);setPreviewShot(false);}
    setStatus(next==='object'?'Object editing':'Mesh '+next+' selection');
  }
  function moveSelectedMesh(kind,index,delta,amend=false,objectId=selectedId){
    const update=s=>({...s,objects:s.objects.map(o=>o.id===objectId&&o.geometry
      ?{...o,geometry:moveMeshComponent(o.geometry,kind,index,delta)}:o)});
    if(amend)amendScene(update);else setScene(update);
    setStatus('Edited mesh '+kind+' '+(index+1));
  }
  function applyFaceOperation(operation,amount){
    if(!selected?.geometry||meshMode!=='face')return;
    try{
      // Validate and calculate before updating React state so an invalid operation
      // cannot throw from inside React's render/update phase.
      const result=operateFace(selected.geometry,meshSelection,operation,Number(amount));
      evaluateModifiers({...selected,geometry:result});
      const id=selectedId;
      setScene(s=>({...s,objects:s.objects.map(o=>o.id===id?{...o,geometry:result}:o)}));
      setPlaying(false);
      setStatus(operation[0].toUpperCase()+operation.slice(1)+' face '+(meshSelection+1)+
        ' · '+result.vertices.length+' vertices / '+result.faces.length+' faces · Undo available');
    }catch(error){setStatus('Mesh operation unavailable: '+error.message);}
  }
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
    setScene(s=>({...s,objects:[...s.objects,o]}));setSelectedId(o.id);setMeshMode('object');setStatus('Added '+o.name);
  }
  function deleteSelected(){
    if(!selectedId)return;
    const remaining=scene.objects.filter(o=>o.id!==selectedId);
    setScene(s=>({...s,objects:remaining}));setSelectedId(remaining[0]?.id||null);setMeshMode('object');
    setStatus('Object deleted');
  }
  function duplicate(){
    if(!selected || scene.objects.length>=100)return;
    const o={...selected,id:id(),name:selected.name+' Copy',
      ...(selected.geometry?{geometry:cloneMesh(selected.geometry)}:{}),
      keyframes:selected.keyframes.map(k=>({
      ...k,position:[k.position[0]+.5,k.position[1],k.position[2]+.5],
      rotation:[...k.rotation],scale:[...k.scale] }))};
    setScene(s=>({...s,objects:[...s.objects,o]}));setSelectedId(o.id);
    setStatus('Object duplicated');
  }
  function editGraphKey(keyFrame,channel,value,amend=false){
    const update=s=>({...s,objects:s.objects.map(o=>o.id===selectedId
      ?setChannelKeyValue(o,keyFrame,channel,value):o)});
    if(amend)amendScene(update);else setScene(update);
    setStatus('Edited '+channel+' key · F'+keyFrame);
  }
  function editGraphCurve(keyFrame,channel,curve,amend=false){
    const update=s=>({...s,objects:s.objects.map(o=>o.id===selectedId
      ?setChannelCurve(o,keyFrame,channel,curve):o)});
    if(amend)amendScene(update);else setScene(update);
    setStatus('Updated '+channel+' easing · F'+keyFrame);
  }
  function seek(next){setPlaying(false);setFrame(clamp(Math.round(next),0,scene.duration));}
  function restoreDraft(){
    if(!recovery?.project)return;
    const restored=recovery.project;
    setHistory(initialHistory(restored));setSelectedId(restored.objects[0]?.id||null);
    setPlaying(false);setFrame(0);setPreviewShot(false);setMeshMode('object');
    setAutosaveEnabled(false);setAutosaveState({kind:'saved',at:recovery.savedAt});
    setRecovery(null);setStatus('Restored previous local project · download JSON for a durable backup');
  }
  function discardDraft(){
    try{clearRecovery(window.localStorage);}
    catch(error){setStatus('Could not discard local draft: '+error.message);return;}
    setRecovery(null);setAutosaveEnabled(false);setAutosaveState({kind:'idle'});
    setStatus('Local draft discarded · current studio scene unchanged');
  }
  function backupDraft(){
    if(!recovery?.raw)return;
    saveBlob(new Blob([recovery.raw],{type:'application/json'}),'framefield-local-draft-backup.json');
    setStatus('Local draft backup downloaded');
  }
  function loadStarter(sceneId){
    try{
      const project=createStarter(sceneId);
      setScene(project);setPlaying(false);setFrame(0);setPreviewShot(false);
      setSelectedId(project.objects[0]?.id||null);setMeshMode('object');setMeshSelection(0);
      setStarterOpen(false);setStatus('Starter scene loaded: '+project.name+' · Undo available');
    }catch(error){setStatus('Starter scene failed: '+error.message);}
  }
  function newProject(){
    if(recording)stopRecording();
    setPlaying(false);setScene({version:1,name:'Untitled Motion',fps:24,duration:120,
      lighting:sanitizeLighting(DEFAULT_LIGHTING),shotCamera:sanitizeShotCamera(DEFAULT_SHOT_CAMERA),
      renderSettings:sanitizeRender(DEFAULT_RENDER),objects:[]});
    setPreviewShot(false);
    setSelectedId(null);setMeshMode('object');setFrame(0);setStatus('New empty project');
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
      setPreviewShot(false);
      setMeshMode('object');setFrame(0);setStatus('Opened '+imported.name);
    }catch(err){setStatus('Import failed: '+err.message);}
  }
  function renderShotFrame(project,f){
    const settings=sanitizeRender(project.renderSettings);
    const canvas=document.createElement('canvas');
    canvas.width=settings.width;canvas.height=settings.height;
    render(canvas,project,f,sanitizeShotCamera(project.shotCamera),null,'orbit',{
      width:settings.width,height:settings.height,pixelRatio:1,helpers:false
    });
    return canvas;
  }
  const pngBlob=canvas=>new Promise((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(Error('Browser could not encode PNG.')),'image/png');
  });
  async function snapshot(){
    if(exporting)return;
    try{
      const canvas=renderShotFrame(scene,frame);
      const blob=await pngBlob(canvas);
      saveBlob(blob,filename(scene.name)+'-shot-f'+String(frame).padStart(4,'0')+'.png');
      setStatus('Clean '+canvas.width+'×'+canvas.height+' shot PNG rendered');
    }catch(error){setStatus('Render failed: '+error.message);}
  }
  async function exportSequence(start,end,step){
    if(exporting||recording)return;
    const project=scene; // freeze this render's scene before the first frame
    const settings=sanitizeRender(project.renderSettings);
    const maxFrames=Math.min(120,Math.max(1,Math.floor(80_000_000/(settings.width*settings.height))));
    let frames;
    try{frames=frameRange(start,end,step,project.duration,maxFrames);}
    catch(error){setStatus('Export unavailable: '+error.message);return;}
    cancelExport.current=false;
    setExporting(true);setPlaying(false);
    const entries=[];let total=0;
    try{
      for(let i=0;i<frames.length;i++){
        if(cancelExport.current)throw Error('Cancelled by user.');
        const canvas=renderShotFrame(project,frames[i]);
        const blob=await pngBlob(canvas);
        const bytes=new Uint8Array(await blob.arrayBuffer());
        total+=bytes.length;
        if(total>140_000_000)throw Error('ZIP would exceed safe browser memory limit.');
        entries.push({name:'frame_'+String(frames[i]).padStart(4,'0')+'.png',data:bytes});
        setExportProgress((i+1)+' / '+frames.length+' frames');
        // Yield between frames for responsive browser controls and cancel button.
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
      if(cancelExport.current)throw Error('Cancelled by user.');
      const zip=makeZip(entries);
      saveBlob(zip,filename(project.name)+'-frames-'+frames[0]+'-'+frames.at(-1)+'.zip');
      setStatus('Exported '+frames.length+' clean PNG frames ('+(zip.size/1048576).toFixed(1)+' MiB ZIP)');
    }catch(error){setStatus('Export stopped: '+error.message);}
    finally{setExporting(false);setExportProgress('');cancelExport.current=false;}
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
    if(previewShot||e.button>2)return;
    const rect=e.currentTarget.getBoundingClientRect();
    if(meshMode!=='object'&&selected?.geometry&&e.button===0&&!e.shiftKey){
      const index=pickComponent(meshHits.current,e.clientX-rect.left,e.clientY-rect.top,14);
      if(index!==null){
        e.currentTarget.setPointerCapture(e.pointerId);
        setMeshSelection(index);setPlaying(false);
        const item=meshHits.current.find(h=>h.index===index);
        drag.current={kind:'mesh',meshKind:meshMode,index,objectId:selectedId,
          source:cloneMesh(selected.geometry),p:atFrame(selected,frame),
          depth:item?.depth||camera.distance,sx:e.clientX,sy:e.clientY,
          changed:false,width:rect.width,height:rect.height};
        return;
      }
    }
    const handle=tool!=='orbit' && e.button===0 && !e.shiftKey && selected && selected.visible
      ?(tool==='rotate'?hitRotateHandle:hitMoveHandle)(handles.current,
         e.clientX-rect.left,e.clientY-rect.top):null;
    e.currentTarget.setPointerCapture(e.pointerId);
    if(handle){
      setPlaying(false);
      drag.current={kind:'axis',mode:tool,handle,sx:e.clientX,sy:e.clientY,
        rotationOrigin:{x:rect.left+handle.origin.x,y:rect.top+handle.origin.y},
        original:atFrame(selected,frame),objectId:selected.id,at:frame,changed:false};
    }else{
      drag.current={kind:'camera',x:e.clientX,y:e.clientY,
        sx:e.clientX,sy:e.clientY,pan:e.shiftKey||e.button===2};
    }
  }
  function pointerMove(e){
    if(previewShot)return;
    const d=drag.current;if(!d)return;
    if(d.kind==='mesh'){
      const delta=dragToLocal(camera,d.p,d.depth,e.clientX-d.sx,e.clientY-d.sy,
        d.width,d.height,e.altKey);
      if(!d.changed&&Math.hypot(...delta)<.001)return;
      const geometry=moveMeshComponent(d.source,d.meshKind,d.index,delta);
      const update=s=>({...s,objects:s.objects.map(o=>o.id===d.objectId
        ?{...o,geometry}:o)});
      if(!d.changed){setScene(update);d.changed=true;}else amendScene(update);
      return;
    }
    if(d.kind==='axis'){
      const dx=e.clientX-d.sx,dy=e.clientY-d.sy;
      const group=d.mode==='move'?'position':d.mode==='rotate'?'rotation':'scale';
      const nextPose={...d.original,[group]:[...d.original[group]]};
      const original=d.original[group][d.handle.index];
      let nextValue;
      if(d.mode==='move'){
        const delta=axisDragWorldDelta(d.handle,dx,dy,e.altKey);
        nextValue=clamp(original+delta,-10000,10000);
      }else if(d.mode==='rotate'){
        const delta=screenRotationDelta(d.rotationOrigin,
          {x:d.sx,y:d.sy},
          {x:e.clientX,y:e.clientY},e.altKey);
        nextValue=clamp(original+delta,-10000,10000);
      }else{
        nextValue=scaledAxisValue(original,d.handle,dx,dy,e.altKey);
      }
      // Ignore click-sized pointer noise; don't create a spurious keyframe.
      if(!d.changed && Math.abs(nextValue-original)<.001)return;
      nextPose[group][d.handle.index]=nextValue;
      const update=s=>({...s,objects:s.objects.map(o=>o.id===d.objectId
        ?putKey(o,d.at,nextPose):o)});
      if(!d.changed){setScene(update);d.changed=true;}
      else amendScene(update);
      return;
    }
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
    if(previewShot)return;
    const d=drag.current;if(!d)return;
    if(d.kind==='mesh'){
      if(d.changed)setStatus('Moved mesh '+d.meshKind+' '+(d.index+1)+' · one Undo step');
      drag.current=null;return;
    }
    if(d.kind==='axis'){
      if(d.changed)setStatus(d.mode+' '+d.handle.name+' · one undo step · F'+d.at);
      drag.current=null;return;
    }
    if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<5 && meshMode==='object' && e.button===0){
      const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      const surface=pickSurface(pickFaces.current,x,y);
      if(surface){setSelectedId(surface);drag.current=null;return;}
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
    {recovery&&<RecoveryPrompt draft={recovery} onRestore={restoreDraft}
      onDiscard={discardDraft} onBackup={backupDraft}/>}
    {starterOpen&&!recovery&&<StarterPicker onClose={()=>setStarterOpen(false)}
      onSelect={loadStarter}/>}
    <header className="topbar">
      <div className="brand"><div className="mark">F<span>✦</span></div><div><strong>FRAMEFIELD</strong><small>STUDIO / React v1.0 candidate</small></div></div>
      <div className="project-meta"><input aria-label="Project name" value={scene.name}
        onChange={e=>setScene(s=>({...s,name:e.target.value.slice(0,80)}))}/>
        <span className="pill"><span className="live-dot"/> ORIGINAL ENGINE</span>
        <span className={'local-save-state '+(autosaveState.kind==='error'?'error':'')}
          aria-live="polite">{autosaveState.kind==='saved'?'Saved locally':autosaveState.kind==='pending'
            ?'Saving locally…':autosaveState.kind==='error'?'Autosave unavailable':'Local autosave ready'}</span>
      </div>
      <div className="top-actions">
        <button className="ghost" disabled={!history.past.length} onClick={undo} title="Undo · Ctrl/Cmd+Z">↶ Undo</button>
        <button className="ghost" disabled={!history.future.length} onClick={redo} title="Redo · Ctrl/Cmd+Shift+Z">↷ Redo</button>
        <button className="ghost" onClick={newProject}>New</button>
        <button className="ghost" onClick={()=>setStarterOpen(true)}>Starter Scenes</button>
        <button className="ghost" onClick={()=>fileRef.current?.click()}>Open JSON</button>
        <button className="ghost" onClick={save}>Save JSON</button>
        <button className="ghost" onClick={snapshot} disabled={exporting}>Render PNG</button>
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
            onClick={()=>{setSelectedId(o.id);setMeshMode('object');setMeshSelection(0);}}>
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
          <p><kbd>Scroll</kbd> Zoom</p><p><kbd>Click surface</kbd> Select object</p>
          <p><kbd>G</kbd> Move · axis drag</p>
          <p><kbd>R</kbd> Rotate · ring drag</p>
          <p><kbd>S</kbd> Scale · axis drag</p>
          <p><kbd>O</kbd> Orbit camera</p>
          <p><kbd>Alt</kbd> + drag Snapping</p>
          <p><kbd>Ctrl</kbd> + <kbd>Z</kbd> Undo</p>
          <p><kbd>V/E/F</kbd> Mesh vertices / edges / faces</p><p><kbd>Esc</kbd> Exit mesh edit</p><p><kbd>Space</kbd> Play / pause</p><p><kbd>K</kbd> Add keyframe</p>
        </div>
      </aside>
      <section className="viewport-panel" aria-label="3D viewport">
        <div className="view-top"><div><span className="view-tag">{previewShot?'SHOT CAMERA':meshMode!=='object'?'MESH '+meshMode.toUpperCase():'PERSPECTIVE'}</span>
          <span>World / Frame {String(frame).padStart(3,'0')}</span></div>
          <div className="viewport-actions" role="toolbar" aria-label="Viewport tools">
            <button className={'tool-button '+(previewShot?'chosen':'')}
              aria-pressed={previewShot} onClick={()=>setPreviewShot(p=>!p)}
              title="Toggle clean saved-camera preview">◧ Shot View</button>
            <button className={'tool-button '+(tool==='move'?'chosen':'')} aria-pressed={tool==='move'}
              onClick={()=>setTool('move')} title="Move · G · Alt snaps 0.25 units">✥ Move</button>
            <button className={'tool-button '+(tool==='rotate'?'chosen':'')} aria-pressed={tool==='rotate'}
              onClick={()=>setTool('rotate')} title="Rotate · R · Alt snaps 15 degrees">⟳ Rotate</button>
            <button className={'tool-button '+(tool==='scale'?'chosen':'')} aria-pressed={tool==='scale'}
              onClick={()=>setTool('scale')} title="Scale · S · Alt snaps 0.1">□ Scale</button>
            <button className={'tool-button '+(tool==='orbit'?'chosen':'')} aria-pressed={tool==='orbit'}
              onClick={()=>setTool('orbit')} title="Orbit camera · O">◎ Orbit</button>
            <button className="ghost small" onClick={()=>setCamera(cameraInitial())}>Reset camera</button>
          </div>
        </div>
        <canvas ref={canvasRef} aria-label="Interactive 3D viewport"
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={()=>drag.current=null} onContextMenu={e=>e.preventDefault()}/>
        <div className="axis-compass" aria-hidden="true"><span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span></div>
        <div className="view-bottom"><span>Original software 3D renderer · no external assets</span>
          <span>{previewShot?'Clean shot preview · camera locked':meshMode!=='object'?'Mesh '+meshMode+' · drag marker · Alt snaps':tool==='move'?'Drag handles · Alt 0.25':tool==='rotate'?'Drag rings · Alt 15°':tool==='scale'?'Drag handles · Alt 0.1':'Orbit camera'} · {camera.distance.toFixed(1)}m</span></div>
      </section>
      <aside className="sidebar right">
        <div className="section-heading">STUDIO INSPECTOR <span>F{String(frame).padStart(3,'0')}</span></div>
        <div className="inspector-tabs" role="group" aria-label="Inspector sections">
          <button aria-pressed={inspectorTab==='object'} onClick={()=>setInspectorTab('object')}>Object</button>
          <button aria-pressed={inspectorTab==='lighting'} onClick={()=>setInspectorTab('lighting')}>Lighting</button>
          <button aria-pressed={inspectorTab==='render'} onClick={()=>setInspectorTab('render')}>Camera/Render</button>
        </div>
        {inspectorTab==='render' ?
          <RenderStudio shotCamera={scene.shotCamera} renderSettings={scene.renderSettings}
            editorCamera={camera} onCameraChange={updateShotCamera}
            onRenderChange={updateRenderSettings} onCaptureView={captureShot}
            previewShot={previewShot} onPreviewChange={setPreviewShot}
            frame={frame} duration={scene.duration} onRenderStill={snapshot}
            onExportSequence={exportSequence} exporting={exporting}
            progress={exportProgress} onCancel={()=>{cancelExport.current=true;}}/> :
        inspectorTab==='lighting' ?
          <LightingEditor lighting={scene.lighting} onChange={updateLighting}/> :
        !selected ? <p className="empty">Select a shape in the scene or viewport.</p> :
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
          <MeshWorkshop object={selected} mode={meshMode} selectedComponent={meshSelection}
            onConvert={convertToMesh} onModeChange={setEditMode}
            onSelectionChange={setMeshSelection} onMove={moveSelectedMesh}
            onOperate={applyFaceOperation}/>
          <ModifierStack object={selected} onChange={updateModifiers}/>
          <MaterialEditor material={selected.material} onChange={updateMaterial}/>
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
    <section className={'timeline-section '+(timelineMode==='graph'?'graph-open':'')} aria-label="Animation timeline">
      <div className="timeline-bar">
        <div className="timeline-title">
          <strong>{timelineMode==='dope'?'DOPE SHEET':'GRAPH EDITOR'}</strong>
          <span>{timelineMode==='dope'?'KEYFRAME TIMELINE':'ANIMATION CURVES'}</span>
        </div>
        <div className="timeline-toggle" role="group" aria-label="Animation editors">
          <button aria-pressed={timelineMode==='dope'} onClick={()=>setTimelineMode('dope')}>Dope Sheet</button>
          <button aria-pressed={timelineMode==='graph'} onClick={()=>setTimelineMode('graph')}>Graph Editor</button>
        </div>
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
      {timelineMode==='graph' ?
        <GraphEditor object={selected} channelId={graphChannel}
          onChannelChange={setGraphChannel} frame={frame} duration={scene.duration}
          onSeek={seek} onKeyValue={editGraphKey} onCurveChange={editGraphCurve}/> :
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
      </div>}
    </section>
    <footer><span>Framefield Studio <span className="muted">· original MIT source · projects stay on your device</span></span>
      <span className="status" role="status" aria-live="polite">{status}</span></footer>
  </div>;
}
