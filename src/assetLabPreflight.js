// Local-only GLB acceptance gate for the independent Character Asset Lab.
// This is NOT the existing editable static GLB importer. SPDX-License-Identifier: MIT
export const MAX_CHARACTER_GLB_BYTES=24*1024*1024;
const fail=message=>{throw Error('Character Lab: '+message);};
const list=(x,label,cap)=>{
  if(x===undefined)return [];
  if(!Array.isArray(x)||x.length>cap)fail('invalid '+label+' count');
  return x;
};
export function inspectCharacterGlb(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<28||buffer.byteLength>MAX_CHARACTER_GLB_BYTES)
    fail('file must be a GLB between 28 bytes and 24 MiB');
  const d=new DataView(buffer);
  if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||
     d.getUint32(8,true)!==buffer.byteLength)fail('invalid GLB 2.0 header');
  let offset=12,json=null,binary=null;
  while(offset<buffer.byteLength){
    if(offset+8>buffer.byteLength)fail('truncated chunk header');
    const size=d.getUint32(offset,true),type=d.getUint32(offset+4,true);
    offset+=8;
    if(size%4||offset+size>buffer.byteLength)fail('invalid chunk length');
    if(type===0x4e4f534a&&json===null&&binary===null){
      try{
        json=JSON.parse(new TextDecoder('utf-8',{fatal:true})
          .decode(new Uint8Array(buffer,offset,size)));
      }catch{fail('invalid GLB JSON');}
    } else if(type===0x004e4942&&json!==null&&binary===null){
      binary={offset,length:size};
    } else fail('unsupported GLB chunk ordering');
    offset+=size;
  }
  if(!json||!binary||json.asset?.version!=='2.0')fail('expected GLB 2.0 JSON and binary chunks');
  if(list(json.extensionsRequired,'required extensions',32).length)
    fail('required glTF extensions are not supported in this preview');
  const buffers=list(json.buffers,'buffers',1);
  if(buffers.length!==1||buffers[0]?.uri!==undefined||
     !Number.isInteger(buffers[0]?.byteLength)||buffers[0].byteLength>binary.length)
    fail('GLB must have one embedded binary buffer');
  const views=list(json.bufferViews,'buffer views',512);
  for(const view of views){
    if(!view||view.buffer!==0||
      !Number.isInteger(view.byteLength)||view.byteLength<1||
      !Number.isInteger(view.byteOffset??0)||view.byteOffset<0||
      (view.byteOffset??0)+view.byteLength>binary.length)
      fail('invalid or out-of-bounds buffer view');
  }
  const images=list(json.images,'images',16);
  for(const img of images){
    if(!img||img.uri!==undefined||!Number.isInteger(img.bufferView)||
      !views[img.bufferView]||!['image/png','image/jpeg'].includes(img.mimeType)||
      views[img.bufferView].byteLength>8*1024*1024)
      fail('textures must be embedded PNG/JPEG under 8 MiB each, never external URIs');
  }
  const textures=list(json.textures,'textures',24);
  const skins=list(json.skins,'skins',16);
  const animations=list(json.animations,'animations',24);
  const nodes=list(json.nodes,'nodes',512);
  const meshes=list(json.meshes,'meshes',64);
  const materials=list(json.materials,'materials',64);
  const accessors=list(json.accessors,'accessors',512);
  let vertexCount=0;
  for(const mesh of meshes){
    const primitives=list(mesh?.primitives,'mesh primitives',24);
    for(const p of primitives){
      const position=accessors[p?.attributes?.POSITION];
      if(!position||!Number.isInteger(position.count)||position.count<1)
        fail('mesh POSITION accessor missing');
      vertexCount+=position.count;
      if(vertexCount>150000)fail('vertex preview budget exceeded');
    }
  }
  for(const skin of skins){
    if(list(skin?.joints,'skin joints',256).some(index=>!Number.isInteger(index)||!nodes[index]))
      fail('invalid skin joint');
  }
  for(const animation of animations){
    list(animation?.channels,'animation channels',256);
    list(animation?.samplers,'animation samplers',256);
  }
  return Object.freeze({
    meshes:meshes.length,skins:skins.length,animations:animations.length,
    materials:materials.length,textures:textures.length,
    nodes:nodes.length,vertices:vertexCount,
    bytes:buffer.byteLength
  });
}
