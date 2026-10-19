import React,{useMemo} from 'react';
import {primitiveMesh} from './mesh.js';
import {evaluateModifiers,MAX_MODIFIERS} from './modifiers.js';

export default function ModifierStack({object,onChange}){
  const stack=object?.modifiers||[];
  const base=object?.geometry||primitiveMesh(object?.type||'box');
  const output=useMemo(()=>{
    if(!object)return null;
    try{return evaluateModifiers(object);}
    catch(error){return {error:error.message};}
  },[object]);
  if(!object)return null;
  const change=(index,patch)=>onChange(stack.map((mod,i)=>i===index?{...mod,...patch}:mod));
  const remove=index=>onChange(stack.filter((_,i)=>i!==index));
  const move=(index,offset)=>{
    const list=stack.map(mod=>({...mod})),target=index+offset;
    if(target<0||target>=list.length)return;
    [list[index],list[target]]=[list[target],list[index]];
    onChange(list);
  };
  return <section className="modifier-stack" aria-label="Non-destructive modifier stack">
    <div className="transform-title">MODIFIER STACK <span>v0.9</span></div>
    <p className="mesh-help">Stack order controls the result. Your editable source mesh
      stays untouched; the final modifiers appear in the viewport and every render.</p>
    <div className="modifier-buttons">
      <button className="ghost" disabled={stack.length>=MAX_MODIFIERS}
        onClick={()=>onChange([...stack,{type:'subdivide',levels:1,enabled:true}])}>
        + Subdivision</button>
      <button className="ghost" disabled={stack.length>=MAX_MODIFIERS}
        onClick={()=>onChange([...stack,{type:'mirror',axis:0,enabled:true}])}>
        + Mirror</button>
    </div>
    {stack.map((mod,i)=><div className="modifier-entry" key={i}>
      <div className="modifier-heading">
        <label><input aria-label={'Modifier '+(i+1)+' enabled'} type="checkbox"
          checked={mod.enabled!==false} onChange={e=>change(i,{enabled:e.target.checked})}/>
          <strong>{i+1}. {mod.type==='subdivide'?'Subdivision':'Mirror'}</strong></label>
        <div className="modifier-actions">
          <button aria-label={'Move modifier '+(i+1)+' up'} disabled={i===0}
            onClick={()=>move(i,-1)} title="Move up">↑</button>
          <button aria-label={'Move modifier '+(i+1)+' down'} disabled={i===stack.length-1}
            onClick={()=>move(i,1)} title="Move down">↓</button>
          <button aria-label={'Remove modifier '+(i+1)} onClick={()=>remove(i)} title="Remove">×</button>
        </div>
      </div>
      {mod.type==='subdivide'?<label className="modifier-setting">Levels
        <select aria-label={'Subdivision '+(i+1)+' levels'} value={mod.levels}
          onChange={e=>change(i,{levels:Number(e.target.value)})}>
          <option value={1}>1 · Preview</option><option value={2}>2 · Smooth</option>
        </select>
      </label>:<label className="modifier-setting">Mirror axis
        <select aria-label={'Mirror '+(i+1)+' axis'} value={mod.axis}
          onChange={e=>change(i,{axis:Number(e.target.value)})}>
          <option value={0}>X</option><option value={1}>Y</option><option value={2}>Z</option>
        </select>
      </label>}
    </div>)}
    {!stack.length&&<p className="mesh-help">No modifiers. Add one above to begin.</p>}
    <div className="modifier-stats" data-testid="modifier-mesh-counts">
      <span>Source: {base.vertices.length}V / {base.faces.length}F</span>
      <span>Preview: {output?.error?'Unavailable':
        output.vertices.length+'V / '+output.faces.length+'F'}</span>
    </div>
    {output?.error&&<p className="mesh-help" role="alert">{output.error}</p>}
    <p className="mesh-help">Mirror keeps the positive half of the chosen local axis and
      reflects it across zero, welding seam vertices. Subdivision uses one or two
      Catmull-Clark smoothing passes. These are modeling previews, not baked meshes.</p>
  </section>;
}
