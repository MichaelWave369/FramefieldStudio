import React,{useEffect,useMemo,useRef,useState} from 'react';
import {atFrame,CHANNELS,CURVE_PRESETS,clamp,sanitizeCurve} from './scene.js';

// Original, local-only graph editor. The SVG is a view over the same scene
// keyframes as the viewport and dope sheet, not a second animation timeline.
const WIDTH=1000,HEIGHT=214;
const L=55,R=26,T=17,B=27;
const plotW=WIDTH-L-R,plotH=HEIGHT-T-B;
const round=n=>Math.round(n*1000)/1000;
const channelColor=channel=>['#f38d9b','#7de4b0','#8ebcff'][channel.index];

export default function GraphEditor({
  object,channelId,onChannelChange,frame,duration,onSeek,onKeyValue,onCurveChange
}){
  const [activeStart,setActiveStart]=useState(null);
  const gesture=useRef(null);
  const svgRef=useRef(null);
  const channel=CHANNELS.find(c=>c.id===channelId)||CHANNELS[0];
  const keys=object?.keyframes||[];
  const group=channel.group,index=channel.index;
  useEffect(()=>setActiveStart(null),[object?.id,channelId]);
  const segmentStart=keys.slice(0,-1).some(k=>k.frame===activeStart)
    ? activeStart : keys[0]?.frame;
  const segIndex=keys.findIndex(k=>k.frame===segmentStart);
  const start=segIndex>=0 && segIndex<keys.length-1?keys[segIndex]:null;
  const end=start?keys[segIndex+1]:null;
  const custom=start?.curves?.[channel.id]||CURVE_PRESETS.linear;
  const curve=custom==='hold'?'hold':sanitizeCurve(custom)||CURVE_PRESETS.linear;
  const preset=Object.entries(CURVE_PRESETS).find(([,v])=>JSON.stringify(v)===JSON.stringify(curve))?.[0]||'custom';
  const graph=useMemo(()=>{
    if(!object||!keys.length)return null;
    const values=keys.map(k=>k[group][index]);
    let minimum=Math.min(...values),maximum=Math.max(...values);
    const range=maximum-minimum;
    const margin=range<.001?Math.max(.8,Math.abs(minimum)*.2):range*.18;
    minimum-=margin;maximum+=margin;
    const xFor=f=>L+clamp(f/duration,0,1)*plotW;
    const yFor=value=>T+(maximum-value)/(maximum-minimum)*plotH;
    const valueFor=y=>maximum-(y-T)/plotH*(maximum-minimum);
    const samples=[];
    for(let f=0;f<=duration;f+=Math.max(1,Math.round(duration/260))){
      samples.push([f,atFrame(object,f)[group][index]]);
    }
    if(samples.at(-1)?.[0]!==duration)
      samples.push([duration,atFrame(object,duration)[group][index]]);
    const path=samples.map(([f,value],i)=>
      (i?'L':'M')+xFor(f).toFixed(2)+','+yFor(value).toFixed(2)).join(' ');
    return {minimum,maximum,xFor,yFor,valueFor,path};
  },[object,keys,group,index,duration]);
  function clientToPoint(e){
    const rect=svgRef.current.getBoundingClientRect();
    return {x:(e.clientX-rect.left)/rect.width*WIDTH,
      y:(e.clientY-rect.top)/rect.height*HEIGHT};
  }
  function pointerDown(e,kind,startFrame,which=null){
    e.stopPropagation();
    if(e.button!==0)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveStart(startFrame);
    const point=clientToPoint(e);
    gesture.current={kind,startFrame,which,first:true,down:point,
      originalKey:keys.find(k=>k.frame===startFrame)?.[group][index],
      originalCurve:curve,graph};
    if(kind==='key')onSeek(startFrame);
  }
  function move(e){
    const drag=gesture.current;
    if(!drag||!object)return;
    const p=clientToPoint(e);
    if(drag.first && Math.hypot(p.x-drag.down.x,p.y-drag.down.y)<2)return;
    if(drag.kind==='key'){
      const value=clamp(round(drag.graph.valueFor(p.y)),-10000,10000);
      if(!Number.isFinite(value))return;
      onKeyValue(drag.startFrame,channel.id,value,!drag.first);
    }else{
      const a=keys.findIndex(k=>k.frame===drag.startFrame);
      if(a<0||a===keys.length-1)return;
      const from=keys[a],to=keys[a+1],p0x=drag.graph.xFor(from.frame),p1x=drag.graph.xFor(to.frame);
      const p0y=drag.graph.yFor(from[group][index]),p1y=drag.graph.yFor(to[group][index]);
      const points=drag.originalCurve==='hold'?[0,0,1,1]:[...drag.originalCurve];
      points[drag.which===0?0:2]=round(clamp((p.x-p0x)/(p1x-p0x),0,1));
      if(Math.abs(p1y-p0y)>1)
        points[drag.which===0?1:3]=round(clamp((p.y-p0y)/(p1y-p0y),0,1));
      onCurveChange(drag.startFrame,channel.id,points,!drag.first);
    }
    drag.first=false;
  }
  function release(){gesture.current=null;}
  if(!object)return <div className="graph-empty">Select an object to edit its motion curves.</div>;
  return <div className="graph-editor" aria-label="Animation graph editor">
    <div className="graph-controls">
      <label>CHANNEL
        <select aria-label="Graph channel" value={channel.id}
          onChange={e=>onChannelChange(e.target.value)}>
          {CHANNELS.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}
        </select>
      </label>
      <label>OUTGOING KEY
        <select aria-label="Graph segment" disabled={keys.length<2}
          value={String(start?.frame??'')} onChange={e=>setActiveStart(Number(e.target.value))}>
          {keys.slice(0,-1).map((k,i)=>
            <option key={k.frame} value={String(k.frame)}>{k.frame} → {keys[i+1].frame}</option>)}
        </select>
      </label>
      <label>INTERPOLATION
        <select aria-label="Curve preset" disabled={!start} value={preset}
          onChange={e=>onCurveChange(start.frame,channel.id,CURVE_PRESETS[e.target.value],false)}>
          {preset==='custom'&&<option value="custom" disabled>Custom curve</option>}
          <option value="linear">Linear</option>
          <option value="smooth">Smooth</option>
          <option value="easeIn">Ease in</option>
          <option value="easeOut">Ease out</option>
          <option value="hold">Hold</option>
        </select>
      </label>
      <div className="graph-readout">{channel.label} <span>· {keys.length} keys · F{frame}</span></div>
    </div>
    <svg ref={svgRef} className="curve-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none" role="img" aria-label="Editable animation curve"
      onPointerMove={move} onPointerUp={release} onPointerCancel={release}>
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#0c1525"/>
      {[0,.25,.5,.75,1].map(v=>
        <g key={v}>
          <line x1={L+v*plotW} x2={L+v*plotW} y1={T} y2={T+plotH}
            stroke="#293651" strokeWidth="1"/>
          <text x={L+v*plotW} y={HEIGHT-8} fill="#95a7c4" fontSize="11"
            textAnchor="middle">{Math.round(duration*v)}</text>
        </g>)}
      {[0,.25,.5,.75,1].map(v=>
        <g key={v}>
          <line x1={L} x2={L+plotW} y1={T+v*plotH} y2={T+v*plotH}
            stroke="#25314a" strokeWidth="1"/>
          <text x={L-9} y={T+v*plotH+4} fill="#95a7c4" fontSize="11"
            textAnchor="end">{graph?round(graph.maximum-v*(graph.maximum-graph.minimum)):''}</text>
        </g>)}
      {graph&&<>
        <path data-testid="channel-curve" d={graph.path} fill="none" stroke="#0b1226"
          strokeWidth="6" strokeLinejoin="round"/>
        <path d={graph.path} fill="none" stroke={channelColor(channel)}
          strokeWidth="2.7" strokeLinejoin="round" pointerEvents="none"/>
        {keys.slice(0,-1).map((k,i)=>{
          const from=graph.xFor(k.frame),to=graph.xFor(keys[i+1].frame);
          return <rect key={'seg-'+k.frame} x={from} y={T} width={to-from}
            height={plotH} fill="transparent" onClick={()=>setActiveStart(k.frame)}/>;
        })}
        <line x1={graph.xFor(frame)} x2={graph.xFor(frame)}
          y1={T} y2={T+plotH} stroke="#f5a5af" strokeWidth="2" pointerEvents="none"/>
        {start&&end&&curve!=='hold'&&preset!=='linear'&&[0,1].map(which=>{
          const x0=graph.xFor(start.frame),x1=graph.xFor(end.frame);
          const y0=graph.yFor(start[group][index]),y1=graph.yFor(end[group][index]);
          const hx=x0+(x1-x0)*curve[which?2:0];
          const hy=y0+(y1-y0)*curve[which?3:1];
          const ax=which?x1:x0,ay=which?y1:y0;
          return <g key={'handle-'+which}>
            <line x1={ax} y1={ay} x2={hx} y2={hy}
              stroke="#e1c8a4" strokeWidth="1.5" strokeDasharray="4 3"/>
            <circle data-testid={`curve-handle-${which}`} cx={hx} cy={hy} r="6"
              fill="#f6d39f" stroke="#162339" strokeWidth="2"
              style={{cursor:'grab',touchAction:'none'}}
              onPointerDown={e=>pointerDown(e,'handle',start.frame,which)}/>
          </g>;
        })}
        {keys.map(k=><circle key={k.frame} data-testid={`curve-key-${k.frame}`}
          cx={graph.xFor(k.frame)} cy={graph.yFor(k[group][index])}
          r="6" stroke="#111c30" strokeWidth="2" fill={channelColor(channel)}
          style={{cursor:'ns-resize',touchAction:'none'}}
          onPointerDown={e=>pointerDown(e,'key',k.frame)}/>)}
      </>}
    </svg>
    <div className="graph-note">
      Drag key dots vertically to change values. Choose Smooth to reveal draggable gold ease handles.
      Click a segment or choose its frames above. Editing is undoable.
    </div>
  </div>;
}
