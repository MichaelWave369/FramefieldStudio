import React,{useState} from 'react';
import {RESOLUTIONS,sanitizeShotCamera,sanitizeRender,frameRange} from './shot.js';
const degree=n=>Math.round(n*180/Math.PI*10)/10;
const rad=n=>n*Math.PI/180;
const num=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number(n)));
export default function RenderStudio({shotCamera,renderSettings,editorCamera,
  onCameraChange,onRenderChange,onCaptureView,previewShot,onPreviewChange,
  frame,duration,onRenderStill,onExportSequence,exporting,progress,onCancel}){
  const shot=sanitizeShotCamera(shotCamera),settings=sanitizeRender(renderSettings);
  const [start,setStart]=useState(0),[end,setEnd]=useState(24),[step,setStep]=useState(1);
  const maxFrames=Math.min(120,Math.max(1,Math.floor(80_000_000/(settings.width*settings.height))));
  let previewCount=0,invalid=false;
  try{previewCount=frameRange(start,end,step,duration,maxFrames).length;}
  catch{invalid=true;}
  function updateCamera(patch){onCameraChange({...shot,...patch});}
  function updateSettings(patch){onRenderChange({...settings,...patch});}
  return <section className="shot-studio" aria-label="Camera and render studio">
    <div className="transform-title">SHOT CAMERA <span>SAVED IN PROJECT</span></div>
    <div className="shot-actions">
      <button className="primary" onClick={onCaptureView}>Use Editor View</button>
      <button className="ghost" onClick={()=>onPreviewChange(!previewShot)}>
        {previewShot?'Return to Editor':'Preview Shot'}</button>
    </div>
    <p className="material-help">Capture the editor angle as your shot, or adjust its framing.
      Shot Preview is locked so accidental orbiting cannot change your composition.</p>
    <div className="shot-fields">
      {[
        {name:'Shot yaw',value:degree(shot.yaw),min:-1700,max:1700,step:5,
          change:n=>updateCamera({yaw:num(rad(n),-30,30)})},
        {name:'Shot pitch',value:degree(shot.pitch),min:-81,max:81,step:5,
          change:n=>updateCamera({pitch:num(rad(n),-1.42,1.42)})},
        {name:'Shot distance',value:Number(shot.distance.toFixed(2)),min:2,max:70,step:.5,
          change:n=>updateCamera({distance:num(n,2,70)})}
      ].map(field=><label className="shot-field" key={field.name}>{field.name}
        <input type="number" aria-label={field.name} value={field.value}
          min={field.min} max={field.max} step={field.step}
          onChange={e=>{if(e.target.value!=='')field.change(Number(e.target.value));}}/>
      </label>)}
    </div>
    <div className="direction-label">LOOK-AT TARGET (X / Y / Z)</div>
    <div className="light-vector">
      {['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}
        <input type="number" aria-label={'Shot target '+axis} min="-100" max="100" step=".1"
          value={Number(shot.target[i].toFixed(2))} onChange={e=>{
            if(e.target.value==='')return;
            const target=[...shot.target];target[i]=num(e.target.value,-100,100);
            updateCamera({target});
          }}/>
      </label>)}
    </div>
    <div className="transform-title">RENDER OUTPUT <span>PNG / ZIP</span></div>
    <label className="shot-field">Resolution
      <select aria-label="Render resolution"
        value={settings.width+'x'+settings.height}
        onChange={e=>{
          const pair=RESOLUTIONS.find(([w,h])=>w+'x'+h===e.target.value);
          if(pair)updateSettings({width:pair[0],height:pair[1]});
        }}>
        {RESOLUTIONS.map(([w,h])=><option key={w+'x'+h} value={w+'x'+h}>{w} × {h}</option>)}
      </select>
    </label>
    <label className="shot-field">Background
      <input type="color" aria-label="Render background" value={settings.background}
        onChange={e=>updateSettings({background:e.target.value})}/>
    </label>
    <button className="primary full" disabled={exporting} onClick={onRenderStill}>
      Render Frame {frame} · PNG</button>
    <div className="transform-title">FRAME SEQUENCE <span>UNCOMPRESSED ZIP</span></div>
    <div className="shot-range">
      <label>FROM<input aria-label="Sequence start" type="number" min="0" max={duration}
        value={start} onChange={e=>setStart(Number(e.target.value))}/></label>
      <label>TO<input aria-label="Sequence end" type="number" min="0" max={duration}
        value={end} onChange={e=>setEnd(Number(e.target.value))}/></label>
      <label>STEP<input aria-label="Sequence step" type="number" min="1" max="60"
        value={step} onChange={e=>setStep(Number(e.target.value))}/></label>
    </div>
    <p className="material-help">{invalid
      ?'Adjust the range or step. This resolution permits up to '+maxFrames+' frames per export.'
      :previewCount+' PNG frames at '+settings.width+'×'+settings.height+'. Frames are rendered from your saved shot camera.'}</p>
    {exporting?<>
      <div className="render-progress" role="status">Rendering {progress}...</div>
      <button className="ghost full" onClick={onCancel}>Cancel export</button>
    </>:<button className="primary full" disabled={invalid}
      onClick={()=>onExportSequence(start,end,step)}>Export PNG Sequence ZIP</button>}
    <p className="material-help">The ZIP contains individual PNG images in frame order.
      No audio, video compression, cloud upload or hidden background render.</p>
  </section>;
}
