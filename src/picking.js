// Perspective face hit-testing. Picks the nearest visible polygon, not just an
// object's center marker. Source mesh, modifiers and animation are renderer-owned.
export function pointInPolygon(points,x,y){
  if(!Array.isArray(points)||points.length<3||!Number.isFinite(x)||!Number.isFinite(y))return false;
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.y>y)!==(b.y>y)){
      const crossing=(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x;
      if(x<crossing)inside=!inside;
    }
  }
  return inside;
}
export function pickSurface(faces,x,y){
  let chosen=null;
  for(const f of faces){
    if(!f.id||!Number.isFinite(f.depth)||!pointInPolygon(f.points,x,y))continue;
    if(!chosen||f.depth<chosen.depth)chosen={id:f.id,depth:f.depth};
  }
  return chosen?.id||null;
}
