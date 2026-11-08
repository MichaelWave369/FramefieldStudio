// Original, self-contained test GLB: embedded PNG, skinned triangle and animation.
// No remote textures, fixture downloads, or third-party character assets.
const PNG=Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3/lKkAAAAASUVORK5CYII=',
  'base64');
const floatBytes=nums=>{
  const b=Buffer.alloc(nums.length*4);
  nums.forEach((n,i)=>b.writeFloatLE(n,i*4));
  return b;
};
const uint16Bytes=nums=>{
  const b=Buffer.alloc(nums.length*2);
  nums.forEach((n,i)=>b.writeUInt16LE(n,i*2));
  return b;
};
export function makeCharacterGlb({externalImage=false,skin=true}={}){
  const parts=[],views=[];
  let byteLength=0;
  const insert=bytes=>{
    const padding=(4-byteLength%4)%4;
    if(padding){parts.push(Buffer.alloc(padding));byteLength+=padding;}
    const start=byteLength;
    parts.push(bytes);byteLength+=bytes.length;
    const id=views.length;
    views.push({buffer:0,byteOffset:start,byteLength:bytes.length});
    return id;
  };
  const positions=insert(floatBytes([-.7,-.6,0, .7,-.6,0, 0,.9,0]));
  const uvs=insert(floatBytes([0,0,1,0,.5,1]));
  const timeView=insert(floatBytes([0,1]));
  const translate=insert(floatBytes([0,0,0, 1.8,0,0]));
  const imageView=insert(PNG);
  let jointView,weightView,inverseView;
  if(skin){
    jointView=insert(uint16Bytes([0,0,0,0,0,0,0,0,0,0,0,0]));
    weightView=insert(floatBytes([1,0,0,0,1,0,0,0,1,0,0,0]));
    inverseView=insert(floatBytes([
      1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
    ]));
  }
  const accessors=[
    {bufferView:positions,componentType:5126,type:'VEC3',count:3,
      min:[-.7,-.6,0],max:[.7,.9,0]},
    {bufferView:uvs,componentType:5126,type:'VEC2',count:3},
    {bufferView:timeView,componentType:5126,type:'SCALAR',count:2,min:[0],max:[1]},
    {bufferView:translate,componentType:5126,type:'VEC3',count:2}
  ];
  const attributes={POSITION:0,TEXCOORD_0:1};
  if(skin){
    attributes.JOINTS_0=accessors.length;
    accessors.push({bufferView:jointView,componentType:5123,type:'VEC4',count:3});
    attributes.WEIGHTS_0=accessors.length;
    accessors.push({bufferView:weightView,componentType:5126,type:'VEC4',count:3});
  }
  let inverseAccessor=null;
  if(skin){
    inverseAccessor=accessors.length;
    accessors.push({bufferView:inverseView,componentType:5126,type:'MAT4',count:1});
  }
  const nodes=[{mesh:0,name:'ChipToonsTestCharacter',...(skin?{skin:0}:{})}];
  if(skin)nodes.push({name:'TestBone',translation:[0,0,0]});
  const json={
    asset:{version:'2.0',generator:'Framefield original test fixture'},
    buffers:[{byteLength}],
    bufferViews:views,accessors,
    images:externalImage?[{uri:'https://example.invalid/tracker.png',mimeType:'image/png'}]:
      [{bufferView:imageView,mimeType:'image/png'}],
    textures:[{source:0}],
    materials:[{name:'TestFabric',pbrMetallicRoughness:{
      baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.65}}],
    meshes:[{primitives:[{attributes,material:0}]}],
    nodes,scenes:[{nodes:nodes.map((_,i)=>i)}],scene:0,
    animations:[{name:'StepSideways',samplers:[{input:2,output:3,interpolation:'LINEAR'}],
      channels:[{sampler:0,target:{node:0,path:'translation'}}]}],
    ...(skin?{skins:[{joints:[1],inverseBindMatrices:inverseAccessor}]}:{})
  };
  const rawJson=Buffer.from(JSON.stringify(json));
  const jsonBytes=Buffer.alloc(Math.ceil(rawJson.length/4)*4,32);
  rawJson.copy(jsonBytes);
  const bin=Buffer.concat(parts);
  const binBytes=Buffer.alloc(Math.ceil(bin.length/4)*4);
  bin.copy(binBytes);
  const file=Buffer.alloc(12+8+jsonBytes.length+8+binBytes.length);
  file.writeUInt32LE(0x46546c67,0);
  file.writeUInt32LE(2,4);
  file.writeUInt32LE(file.length,8);
  file.writeUInt32LE(jsonBytes.length,12);
  file.writeUInt32LE(0x4e4f534a,16);
  jsonBytes.copy(file,20);
  const binStart=20+jsonBytes.length;
  file.writeUInt32LE(binBytes.length,binStart);
  file.writeUInt32LE(0x004e4942,binStart+4);
  binBytes.copy(file,binStart+8);
  return file;
}
