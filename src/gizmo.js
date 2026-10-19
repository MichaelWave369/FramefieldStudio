// Independent viewport move handles and screen-to-axis translation.
// SPDX-License-Identifier: MIT
export const AXES=[
  {name:'X',index:0,color:'#f38d9b'},
  {name:'Y',index:1,color:'#7de4b0'},
  {name:'Z',index:2,color:'#8ebcff'}
];
export function makeMoveHandles(pose,project){
  const origin=project(pose.position);
  if(!origin)return [];
  const worldLength=1.4;
  return AXES.flatMap(axis=>{
    const endWorld=[...pose.position];
    endWorld[axis.index]+=worldLength;
    const end=project(endWorld);
    if(!end)return [];
    const dx=end.x-origin.x,dy=end.y-origin.y;
    const length2=dx*dx+dy*dy;
    // Nearly edge-on axis directions are too small to drag accurately.
    if(length2<144)return [];
    return [{...axis,origin,end,dx,dy,length2,worldLength}];
  });
}
export function hitMoveHandle(handles,x,y){
  let best=null,min=12;
  for(const handle of handles){
    const t=((x-handle.origin.x)*handle.dx+(y-handle.origin.y)*handle.dy)/handle.length2;
    if(t<.28||t>1.18)continue;
    const px=handle.origin.x+Math.min(1,Math.max(0,t))*handle.dx;
    const py=handle.origin.y+Math.min(1,Math.max(0,t))*handle.dy;
    const distance=Math.hypot(x-px,y-py);
    if(distance<min){min=distance;best=handle;}
  }
  return best;
}
export function axisDragWorldDelta(handle,screenDX,screenDY,snap=false){
  const projected=handle.worldLength*(screenDX*handle.dx+screenDY*handle.dy)/handle.length2;
  const safe=Math.min(100,Math.max(-100,projected));
  return snap?Math.round(safe*4)/4:safe;
}
export function drawMoveHandles(ctx,handles){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(const h of handles){
    ctx.beginPath();ctx.moveTo(h.origin.x,h.origin.y);ctx.lineTo(h.end.x,h.end.y);
    ctx.strokeStyle='#091225';ctx.lineWidth=7;ctx.stroke();
    ctx.strokeStyle=h.color;ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(h.end.x,h.end.y,5.5,0,Math.PI*2);
    ctx.fillStyle=h.color;ctx.fill();
    ctx.font='700 12px system-ui';ctx.fillStyle='#f7f9ff';
    ctx.shadowColor='#071221';ctx.shadowBlur=4;
    ctx.fillText(h.name,h.end.x+9,h.end.y-7);ctx.shadowBlur=0;
  }
  ctx.restore();
}

// Scale handles share the camera-projected world axes but use square endpoints.
// The gizmo intentionally stays world-aligned, like our existing move tool.
export function drawScaleHandles(ctx,handles){
  ctx.save();ctx.lineCap='round';
  for(const h of handles){
    ctx.beginPath();ctx.moveTo(h.origin.x,h.origin.y);ctx.lineTo(h.end.x,h.end.y);
    ctx.strokeStyle='#091225';ctx.lineWidth=7;ctx.stroke();
    ctx.strokeStyle=h.color;ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle=h.color;ctx.fillRect(h.end.x-6,h.end.y-6,12,12);
    ctx.font='700 12px system-ui';ctx.fillStyle='#fff';
    ctx.fillText(h.name,h.end.x+10,h.end.y-9);
  }
  ctx.restore();
}
export function scaledAxisValue(original,handle,dx,dy,snap=false){
  // Multiplicative editing keeps mirrored/negative scale sign intact.
  const delta=axisDragWorldDelta(handle,dx,dy,false);
  const multiplier=Math.max(.05,Math.min(20,1+delta*.60));
  const sign=Math.sign(original)||1;
  let next=sign*Math.max(.05,Math.min(10000,Math.abs(original)*multiplier));
  if(snap)next=sign*Math.max(.05,Math.round(Math.abs(next)*10)/10);
  return next;
}
// World-axis rotation rings projected into the current perspective camera.
export function makeRotateHandles(pose,project){
  const origin=project(pose.position);
  if(!origin)return [];
  const radius=1.65,segments=72;
  return AXES.flatMap(axis=>{
    const points=[];
    for(let i=0;i<=segments;i++){
      const angle=i/segments*Math.PI*2;
      const v=[0,0,0];
      const indices=axis.index===0?[1,2]:axis.index===1?[0,2]:[0,1];
      v[indices[0]]=radius*Math.cos(angle);
      v[indices[1]]=radius*Math.sin(angle);
      const p=project(pose.position.map((n,j)=>n+v[j]));
      if(!p)return [];
      points.push(p);
    }
    return [{...axis,origin,points}];
  });
}
function pointSegmentDistance(x,y,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,denom=dx*dx+dy*dy;
  const t=denom?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/denom)):0;
  return Math.hypot(x-(a.x+t*dx),y-(a.y+t*dy));
}
export function hitRotateHandle(handles,x,y){
  let found=null,best=10;
  for(const ring of handles){
    for(let i=0;i<ring.points.length-1;i++){
      const distance=pointSegmentDistance(x,y,ring.points[i],ring.points[i+1]);
      if(distance<best){best=distance;found=ring;}
    }
  }
  return found;
}
export function screenRotationDelta(origin,start,end,snap=false){
  const ax=start.x-origin.x,ay=start.y-origin.y;
  const bx=end.x-origin.x,by=end.y-origin.y;
  if(Math.hypot(ax,ay)<8||Math.hypot(bx,by)<8)return 0;
  const degrees=Math.atan2(ax*by-ay*bx,ax*bx+ay*by)*180/Math.PI;
  return snap?Math.round(degrees/15)*15:degrees;
}
export function drawRotateHandles(ctx,handles){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(const ring of handles){
    ctx.beginPath();
    ring.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle='#081226';ctx.lineWidth=7;ctx.stroke();
    ctx.strokeStyle=ring.color;ctx.lineWidth=3;ctx.stroke();
    // Label at the first ring sample.
    const label=ring.points[0];
    ctx.font='700 12px system-ui';ctx.fillStyle='#fff';
    ctx.fillText(ring.name,label.x+8,label.y-8);
  }
  ctx.restore();
}
