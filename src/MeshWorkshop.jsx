import React from 'react';
import {componentIndices,uniqueEdges} from './mesh.js';
export default function MeshWorkshop({object,mode,selectedComponent,onConvert,onModeChange,onSelectionChange,onMove,onOperate}){
  const [extrude,setExtrude]=React.useState(.45);
  const [inset,setInset]=React.useState(.25);
  const [bevel,setBevel]=React.useState(.2);
  if(!object)return null;
  const m=object.geometry;
  if(!m)return <section className="mesh-workshop" aria-label="Mesh Workshop">
    <div className="transform-title">MESH WORKSHOP <span>v0.8</span></div>
    <p className="mesh-help">Turn this primitive into editable geometry while keeping its animation.</p>
    <button className="primary full" onClick={onConvert}>Convert to Editable Mesh</button>
  </section>;
  const edges=uniqueEdges(m),kind=mode==='object'?'vertex':mode;
  const max=kind==='vertex'?m.vertices.length:kind==='edge'?edges.length:m.faces.length;
  const index=Math.min(Math.max(selectedComponent,0),max-1);
  const ids=componentIndices(m,kind,index);
  const center=ids.length?ids.reduce((sum,i)=>sum.map((n,j)=>n+m.vertices[i][j]/ids.length),[0,0,0]):[0,0,0];
  return <section className="mesh-workshop" aria-label="Mesh Workshop">
    <div className="transform-title">MESH WORKSHOP <span>EDITABLE</span></div>
    <div className="mesh-counts"><span>{m.vertices.length} vertices</span><span>{edges.length} edges</span><span>{m.faces.length} faces</span></div>
    <div className="mesh-modes" role="group" aria-label="Mesh selection mode">
      {['object','vertex','edge','face'].map(choice=><button key={choice}
        aria-pressed={mode===choice} onClick={()=>onModeChange(choice)}>
        {choice==='object'?'Done':choice[0].toUpperCase()+choice.slice(1)}</button>)}
    </div>
    {mode!=='object'&&<>
      <p className="mesh-help">Select and drag a {kind} marker directly in the viewport. Alt snaps movement; Shift-drag pans.</p>
      <label className="mesh-select">SELECT {kind.toUpperCase()}
        <select aria-label="Selected mesh element" value={index}
          onChange={e=>onSelectionChange(Number(e.target.value))}>
          {Array.from({length:max},(_,i)=><option value={i} key={i}>{kind} {i+1}</option>)}
        </select>
      </label>
      <div className="mesh-coordinates">
        {['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}
          <input aria-label={'Mesh '+kind+' '+axis} type="number" step=".1"
            value={Number(center[i].toFixed(3))} onChange={e=>{
              if(e.target.value==='')return;
              const val=Number(e.target.value);
              if(Number.isFinite(val))onMove(kind,index,[0,1,2].map(j=>j===i?val-center[i]:0));
            }}/>
        </label>)}
      </div>
      {mode==='face'&&<div className="topology-tools" role="group" aria-label="Face topology tools">
        <div className="transform-title">TOPOLOGY TOOLS <span>FACE ONLY</span></div>
        <p className="mesh-help">Each operation creates a new cap on this face and
          connects it to the original border. Undo reverses the entire operation.</p>
        {[
          {key:'extrude',title:'Extrude Face',hint:'Height',value:extrude,set:setExtrude,min:.01,max:5,step:.05},
          {key:'inset',title:'Inset Face',hint:'Inset ratio',value:inset,set:setInset,min:.05,max:.8,step:.05},
          {key:'bevel',title:'Bevel Face',hint:'Chamfer depth',value:bevel,set:setBevel,min:.01,max:5,step:.05}
        ].map(op=><div className="topology-row" key={op.key}>
          <label>{op.hint}
            <input aria-label={op.title+' amount'} type="number" value={op.value}
              min={op.min} max={op.max} step={op.step}
              onChange={e=>{if(e.target.value==='')return;
                const n=Number(e.target.value);if(Number.isFinite(n))op.set(n);}}/>
          </label>
          <button className="topology-action" onClick={()=>onOperate(op.key,op.value)}>{op.title}</button>
        </div>)}
        <p className="mesh-help">Bevel Face adds one sloped chamfer ring, not a rounded edge
          bevel. Inset amounts are fractions of the face size.</p>
      </div>}
    </>}
    <p className="mesh-help">Edits are undoable, and local mesh geometry is saved in JSON. Object keyframes remain unchanged.</p>
  </section>;
}
