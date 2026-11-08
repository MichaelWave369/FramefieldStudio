// Isolated, read-only GLB / glTF character preview.
// File bytes stay in browser memory. No scene-file changes. SPDX-License-Identifier: MIT
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {advanceCharacterTime,frameToSeconds,MAX_CLIP_SECONDS} from './characterTimeline.js';
import {MAX_MORPH_CONTROLS,clampMorphWeight} from './characterPosePack.js';
import {evaluateExpressionTrack} from './characterActingTimeline.js';

function disposeAsset(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  root.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    if(node.skeleton)skeletons.add(node.skeleton);
    for(const m of (Array.isArray(node.material)?node.material:[node.material])){
      if(!m)continue;
      materials.add(m);
      for(const val of Object.values(m))if(val?.isTexture)textures.add(val);
    }
  });
  for(const item of skeletons)item.dispose?.();
  for(const item of geometries)item.dispose();
  for(const item of materials)item.dispose();
  for(const item of textures)item.dispose();
}

export async function createCharacterPreview(canvas,buffer,onContextLoss=()=>{},onProgress=()=>{}){
  const loader=new GLTFLoader();
  // Preflight excludes external buffers and images; the empty resource base is deliberate.
  const gltf=await new Promise((resolve,reject)=>loader.parse(buffer,'',resolve,reject));
  let renderer=null,controls=null,disposed=false,raf=0,resizeObserver=null;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'default',
      preserveDrawingBuffer:true});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color('#0b1528');
    const stage=new THREE.Group();
    stage.add(gltf.scene);
    scene.add(stage);
    const box=new THREE.Box3().setFromObject(gltf.scene);
    if(box.isEmpty())throw Error('Character Lab: model contains no visible geometry');
    const center=box.getCenter(new THREE.Vector3());
    const dimensions=box.getSize(new THREE.Vector3());
    const radius=Math.max(dimensions.length(),.1);
    if(!Number.isFinite(radius)||radius>10000)throw Error('Character Lab: invalid model bounds');
    stage.position.copy(center).multiplyScalar(-1);

    scene.add(new THREE.HemisphereLight(0xf4f6ff,0x30435c,2.0));
    const key=new THREE.DirectionalLight(0xffedcf,3.2);
    key.position.set(radius*1.2,radius*1.5,radius*.9);
    key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-radius;
    key.shadow.camera.right=radius;
    key.shadow.camera.top=radius;
    key.shadow.camera.bottom=-radius;
    key.shadow.camera.near=.01;
    key.shadow.camera.far=Math.max(radius*5,10);
    scene.add(key,key.target);
    const fill=new THREE.DirectionalLight(0x97c6ff,1.3);
    fill.position.set(-radius,radius*.7,-radius);
    scene.add(fill);

    const camera=new THREE.PerspectiveCamera(42,1,.01,Math.max(100,radius*50));
    camera.position.set(radius*.7,radius*.35,radius*1.35);
    controls=new OrbitControls(camera,canvas);
    controls.enableDamping=true;
    controls.enablePan=false;
    controls.minDistance=radius*.35;
    controls.maxDistance=radius*4;
    controls.target.set(0,0,0);
    controls.update();

    // Character expression targets are identified by traversal order and target
    // index. Bookmarks are locked to the exact source GLB SHA-256, not the mesh name.
    const morphTargets=[],morphBindings=new Map(),morphDefaults=new Map();
    let meshIndex=0;
    gltf.scene.traverse(node=>{
      if(!node.isMesh)return;
      const slot=meshIndex++;
      const weights=node.morphTargetInfluences;
      if(!Array.isArray(weights)||!weights.length)return;
      const dictionary=node.morphTargetDictionary||{};
      const targetNames=new Map(Object.entries(dictionary).map(([name,index])=>[index,name]));
      for(let index=0;index<weights.length;index++){
        if(morphTargets.length>=MAX_MORPH_CONTROLS)
          throw Error('Character Lab: too many expression targets (64 maximum)');
        const id=slot+':'+index;
        const label=targetNames.get(index)||'Target '+(index+1);
        morphBindings.set(id,{node,index});
        morphDefaults.set(id,weights[index]);
        morphTargets.push({id,label:meshIndex===1?label:(node.name||'Mesh '+(slot+1))+' / '+label});
      }
    });
    const morphOverrides=new Map();
    let actingKeys=[];
    const morphIds=morphTargets.map(target=>target.id);
    function baseMorphs(){
      for(const [id,binding] of morphBindings)
        binding.node.morphTargetInfluences[binding.index]=morphDefaults.get(id);
    }
    function applyMorphs(){
      // Keys sit above imported animation, while manual sliders stay above keys.
      // That permits adjusting a channel at the playhead before storing a key.
      const evaluated=selectedClip>=0?evaluateExpressionTrack(
        actingKeys,selectedClip,Math.round(playheadSeconds*1000),morphIds):null;
      if(evaluated){
        for(const [id,value] of Object.entries(evaluated)){
          const target=morphBindings.get(id);
          if(target)target.node.morphTargetInfluences[target.index]=value;
        }
      }
      for(const [id,value] of morphOverrides){
        const target=morphBindings.get(id);
        if(target)target.node.morphTargetInfluences[target.index]=value;
      }
    }
    function setMorphWeight(id,weight){
      if(!morphBindings.has(id))throw Error('Character Lab: unknown expression target');
      const value=clampMorphWeight(weight);
      morphOverrides.set(id,value);
      applyMorphs();
      return value;
    }
    function setMorphValues(raw){
      if(!raw||typeof raw!=='object'||Array.isArray(raw))
        throw Error('Character Lab: invalid expression values');
      const entries=Object.entries(raw);
      if(entries.length>MAX_MORPH_CONTROLS)throw Error('Character Lab: too many expressions');
      if(entries.some(([id,value])=>!morphBindings.has(id)||
        typeof value!=='number'||!Number.isFinite(value)||value<0||value>1))
        throw Error('Character Lab: invalid expression target or weight');
      morphOverrides.clear();
      for(const [id,value] of entries)morphOverrides.set(id,value);
      // A bookmarked pose restores the authored animation before applying
      // overrides. This prevents stale smile/blink values from leaking.
      baseMorphs();
      if(action)sampleTime(playheadSeconds);
      applyMorphs();
    }
    function getDisplayedMorphValues(){
      return Object.fromEntries([...morphBindings.entries()].map(([id,{node,index}])=>
        [id,node.morphTargetInfluences[index]]));
    }
    function clearManualMorphValues(){
      morphOverrides.clear();
      if(action)sampleTime(playheadSeconds);
      else{baseMorphs();applyMorphs();}
    }
    function setActingKeys(keys){
      actingKeys=keys.map(key=>({...key,morphs:{...key.morphs}}))
        .sort((a,b)=>a.clipIndex-b.clipIndex||a.timeMs-b.timeMs);
      if(action)sampleTime(playheadSeconds);
      else{baseMorphs();applyMorphs();}
      return getDisplayedMorphValues();
    }
    const mixer=new THREE.AnimationMixer(gltf.scene);
    const clips=gltf.animations||[];
    for(const clip of clips){
      if(!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>MAX_CLIP_SECONDS)
        throw Error('Character Lab: animation duration exceeds 300 seconds or is invalid');
    }
    let action=null,playing=false,selectedClip=-1,playheadSeconds=0,loop=true;
    function sampleTime(seconds){
      if(!action)return 0;
      const duration=clips[selectedClip].duration;
      playheadSeconds=Math.max(0,Math.min(duration,seconds));
      // Three's LoopRepeat wraps at the exact endpoint; sample infinitesimally
      // before the boundary so the last frame does not jump back to frame zero.
      baseMorphs();
      mixer.setTime(Math.min(playheadSeconds,Math.max(0,duration-1e-5)));
      applyMorphs();
      return playheadSeconds;
    }
    function selectClip(index){
      if(!Number.isInteger(index)||index<0||index>=clips.length){
        mixer.stopAllAction();
        action=null;selectedClip=-1;playing=false;playheadSeconds=0;
        onProgress(0,false);
        return;
      }
      mixer.stopAllAction();
      selectedClip=index;
      action=mixer.clipAction(clips[index]);
      action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
      playing=false;
      sampleTime(0);
      onProgress(0,false);
    }
    function setPlaying(next){
      if(!action)return false;
      if(next&&playheadSeconds>=clips[selectedClip].duration)sampleTime(0);
      playing=Boolean(next);
      onProgress(playheadSeconds,playing);
      return playing;
    }
    function seekFrame(frame,fps){
      if(!action)return 0;
      playing=false;
      sampleTime(frameToSeconds(frame,clips[selectedClip].duration,fps));
      onProgress(playheadSeconds,false);
      return playheadSeconds;
    }
    function setLoop(value){loop=Boolean(value);}
    if(clips.length)selectClip(0);
    function resize(){
      const rect=canvas.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width||700));
      const height=Math.max(1,Math.round(rect.height||400));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;
      camera.updateProjectionMatrix();
    }
    resizeObserver=new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    let last=0;
    function tick(t){
      if(disposed)return;
      const delta=last?Math.min((t-last)/1000,.05):0;
      last=t;
      if(playing&&action){
        const advance=advanceCharacterTime(playheadSeconds,delta,clips[selectedClip].duration,loop);
        sampleTime(advance.seconds);
        playing=advance.playing;
        onProgress(playheadSeconds,playing);
      }
      controls.update();
      renderer.render(scene,camera);
      raf=requestAnimationFrame(tick);
    }
    const lost=event=>{
      event.preventDefault();
      if(!disposed)onContextLoss(Error('Character Lab: WebGL context lost'));
    };
    canvas.addEventListener('webglcontextlost',lost);
    resize();
    raf=requestAnimationFrame(tick);
    return {
      clips:clips.map((clip,index)=>({index,name:clip.name||'Action '+(index+1),
        duration:Number(clip.duration.toFixed(2))})),
      stats:{
        meshes:(()=>{let count=0;gltf.scene.traverse(n=>{if(n.isMesh)count++;});return count;})(),
        bones:(()=>{let count=0;gltf.scene.traverse(n=>{if(n.isBone)count++;});return count;})()
      },
      selectClip,setPlaying,seekFrame,setLoop,setMorphWeight,setMorphValues,
      setActingKeys,clearManualMorphValues,getDisplayedMorphValues,
      morphTargets,
      getMorphValues:()=>Object.fromEntries(morphOverrides),
      async capturePng(){
        if(disposed)throw Error('Character Lab: preview is closed');
        // Preserve the selected pose; capture remains local and never edits JSON.
        renderer.render(scene,camera);
        return new Promise((resolve,reject)=>{
          canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG capture failed')),'image/png');
        });
      },
      dispose(){
        if(disposed)return;
        disposed=true;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        canvas.removeEventListener('webglcontextlost',lost);
        controls.dispose();
        mixer.stopAllAction();
        mixer.uncacheRoot(gltf.scene);
        disposeAsset(gltf.scene);
        key.shadow.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      }
    };
  }catch(error){
    controls?.dispose();
    resizeObserver?.disconnect();
    disposeAsset(gltf.scene);
    renderer?.dispose();
    renderer?.forceContextLoss();
    throw error;
  }
}
