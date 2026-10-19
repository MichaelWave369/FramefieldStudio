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
