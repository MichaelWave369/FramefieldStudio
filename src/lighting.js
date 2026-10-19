// Framefield Studio material and lighting math. Original MIT code.
// This is a small face-shading approximation for our Canvas2D renderer,
// not a physically based GPU shader, ray tracer, reflection or shadow system.
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const cap=(n,a,b)=>Math.min(b,Math.max(a,n));
const HEX=/^#[0-9a-f]{6}$/i;
const safeHex=(value,fallback)=>typeof value==='string'&&HEX.test(value)?value.toLowerCase():fallback;
export const DEFAULT_MATERIAL=Object.freeze({roughness:.74,metalness:0,emission:0});
export const MATERIAL_PRESETS=Object.freeze({
  Matte:{roughness:.93,metalness:0,emission:0},
  Satin:{roughness:.52,metalness:0,emission:0},
  Gloss:{roughness:.12,metalness:0,emission:0},
  Metal:{roughness:.2,metalness:.92,emission:0}
});
export const DEFAULT_LIGHTING=Object.freeze({
  ambient:.48,
  key:{enabled:true,intensity:1.18,color:'#fff1d9',direction:[.65,1.25,.85]},
  fill:{enabled:true,intensity:.42,color:'#95bfff',direction:[-1,.35,-.8]}
});
export function sanitizeMaterial(raw){
  const obj=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {
    roughness:cap(finite(obj.roughness,DEFAULT_MATERIAL.roughness),0,1),
    metalness:cap(finite(obj.metalness,DEFAULT_MATERIAL.metalness),0,1),
    emission:cap(finite(obj.emission,DEFAULT_MATERIAL.emission),0,1)
  };
}
function sanitizeLight(raw,fallback){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {
    enabled:typeof src.enabled==='boolean'?src.enabled:fallback.enabled,
    intensity:cap(finite(src.intensity,fallback.intensity),0,3),
    color:safeHex(src.color,fallback.color),
    direction:Array.isArray(src.direction)&&src.direction.length===3
      ?src.direction.map((n,i)=>cap(finite(n,fallback.direction[i]),-3,3))
      :[...fallback.direction]
  };
}
export function sanitizeLighting(raw){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {
    ambient:cap(finite(src.ambient,DEFAULT_LIGHTING.ambient),0,1),
    key:sanitizeLight(src.key,DEFAULT_LIGHTING.key),
    fill:sanitizeLight(src.fill,DEFAULT_LIGHTING.fill)
  };
}
const colorToRgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const length=v=>Math.hypot(...v);
const unit=v=>{const len=length(v)||1;return v.map(n=>n/len);};
export function shadeFace(hex,materialRaw,lightingRaw,normalRaw,center,eye){
  const base=colorToRgb(safeHex(hex,'#9991ff'));
  const material=sanitizeMaterial(materialRaw);
  const lights=lightingRaw||DEFAULT_LIGHTING;
  const view=unit(subtract(eye,center));
  let normal=unit(normalRaw);
  // Primitives have mixed winding: orient double-sided polygon normals to viewer.
  if(dot(normal,view)<0)normal=normal.map(n=>-n);
  const diffuse=[0,1,2].map(()=>cap(finite(lights.ambient,DEFAULT_LIGHTING.ambient),0,1)*.70);
  const specular=[0,0,0];
  for(const source of [lights.key,lights.fill]){
    if(!source||source.enabled===false||source.intensity<=0)continue;
    const sun=unit(source.direction);
    const ndotl=Math.max(0,dot(normal,sun));
    const halfway=unit(sun.map((v,i)=>v+view[i]));
    const ndoth=Math.max(0,dot(normal,halfway));
    const shininess=4+128*(1-material.roughness)**2;
    const highlight=Math.pow(ndoth,shininess)*(1-material.roughness*.60)
      *(.09+material.metalness*.7)*source.intensity;
    const tint=colorToRgb(safeHex(source.color,'#ffffff'));
    for(let i=0;i<3;i++){
      diffuse[i]+=source.intensity*ndotl*tint[i]*.82;
      specular[i]+=highlight*tint[i]*(material.metalness?base[i]*material.metalness+(1-material.metalness):1);
    }
  }
  const out=base.map((v,i)=>Math.round(cap(255*(v*(diffuse[i]*(1-material.metalness*.20)+material.emission*1.4)+specular[i]),0,255)));
  return 'rgb('+out.join(',')+')';
}
