import React from 'react';
import {componentIndices,uniqueEdges} from './mesh.js';
export default function MeshWorkshop({object,mode,selectedComponent,onConvert,onModeChange,onSelectionChange,onMove}){
  if(!object)return null;
  const m=object.geometry;
  if(!m)return <section className="mesh-workshop" aria-label="Mesh Workshop">
    <div className="transform-title">MESH WORKSHOP <span>v0.7</span></div>
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
    </>}
    <p className="mesh-help">Edits are undoable, and local mesh geometry is saved in JSON. Object keyframes remain unchanged.</p>
  </section>;
}
