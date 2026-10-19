import React from 'react';
import {DEFAULT_LIGHTING,MATERIAL_PRESETS,sanitizeMaterial,sanitizeLighting} from './lighting.js';
const decimals=n=>Number(n.toFixed(2));
function Numeric({label,value,onChange,min=0,max=1,step=.05}){
  return <label className="material-number">{label}
    <input aria-label={label} type="number" min={min} max={max} step={step}
      value={decimals(value)} onChange={e=>{
        if(e.target.value==='')return;
        const number=Number(e.target.value);
        if(Number.isFinite(number))onChange(Math.min(max,Math.max(min,number)));
      }}/>
  </label>;
}
export function MaterialEditor({material,onChange}){
  const m=sanitizeMaterial(material);
  const chosen=Object.entries(MATERIAL_PRESETS).find(([,v])=>
    v.roughness===m.roughness&&v.metalness===m.metalness&&v.emission===m.emission)?.[0];
  return <section className="material-editor" aria-label="Surface material">
    <div className="transform-title">SURFACE MATERIAL <span>REAL-TIME PREVIEW</span></div>
    <div className="material-presets" role="group" aria-label="Material presets">
      {Object.entries(MATERIAL_PRESETS).map(([name,preset])=>
        <button key={name} className={'material-preset '+(chosen===name?'chosen':'')}
          aria-pressed={chosen===name} onClick={()=>onChange(preset)}>{name}</button>)}
    </div>
    <div className="material-numbers">
      <Numeric label="Roughness" value={m.roughness}
        onChange={value=>onChange({roughness:value})}/>
      <Numeric label="Metalness" value={m.metalness}
        onChange={value=>onChange({metalness:value})}/>
      <Numeric label="Emission" value={m.emission}
        onChange={value=>onChange({emission:value})}/>
    </div>
    <p className="material-help">Diffuse light, soft highlights and emission are approximated per polygon.
      No environment reflections or ray-traced shadows yet.</p>
  </section>;
}
export function LightingEditor({lighting,onChange}){
  const state=sanitizeLighting(lighting);
  const lightField=(type,field,value)=>onChange({[type]:{[field]:value}});
  return <section className="lighting-editor" aria-label="Scene lighting editor">
    <div className="transform-title">ENVIRONMENT <span>SHARED BY ALL OBJECTS</span></div>
    <Numeric label="Ambient strength" value={state.ambient}
      onChange={ambient=>onChange({ambient})} min={0} max={1} step={.05}/>
    <div className="light-cue" aria-hidden="true"
      style={{background:`linear-gradient(115deg, ${state.key.color}, ${state.fill.color})`}}/>
    {['key','fill'].map(type=>{
      const light=state[type],title=type==='key'?'Key light':'Fill light';
      return <fieldset key={type} className="light-settings">
        <legend>{title.toUpperCase()}</legend>
        <label className="light-enabled">
          <input type="checkbox" aria-label={title+' enabled'} checked={light.enabled}
            onChange={e=>lightField(type,'enabled',e.target.checked)}/>
          Enabled
        </label>
        <Numeric label={title+' intensity'} value={light.intensity} max={3} step={.1}
          onChange={n=>lightField(type,'intensity',n)}/>
        <label className="light-color">{title} color
          <input aria-label={title+' color'} type="color" value={light.color}
            onChange={e=>lightField(type,'color',e.target.value)}/>
        </label>
        <div className="direction-label">DIRECTION TOWARD SURFACE</div>
        <div className="light-vector">
          {['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}
            <input aria-label={title+' direction '+axis} type="number" min="-3" max="3" step=".1"
              value={decimals(light.direction[i])} onChange={e=>{
                if(e.target.value==='')return;
                const n=Number(e.target.value);
                if(!Number.isFinite(n))return;
                const next=[...light.direction];next[i]=Math.max(-3,Math.min(3,n));
                lightField(type,'direction',next);
              }}/>
          </label>)}
        </div>
      </fieldset>;
    })}
    <button className="ghost full" onClick={()=>onChange({__reset:true})}>Reset studio lighting</button>
    <p className="material-help">Ambient and two directional lights shade polygon faces locally.
      Lighting changes affect preview, PNG snapshots and browser-recorded WebM.</p>
  </section>;
}
