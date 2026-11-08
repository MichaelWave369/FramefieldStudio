// Optional Three.js WebGL preview. Never writes or serializes Framefield projects.
// SPDX-License-Identifier: MIT
import * as THREE from 'three';
import {makeGpuDrawables} from './gpuGeometry.js';
import {sanitizeLighting,sanitizeMaterial} from './lighting.js';

export function createGpuViewport(canvas,onError=()=>{}) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'default'});
  // A lost device context must not leave artists with a silent blank canvas.
  const onContextLost=event=>{
    event.preventDefault();
    if(!disposed)onError(Error('WebGL context lost; the editor was restored.'));
  };
  canvas.addEventListener('webglcontextlost',onContextLost);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene3=new THREE.Scene();
  const root=new THREE.Group();
  scene3.add(root);
  const ambient=new THREE.AmbientLight(0xffffff,0.5);
  scene3.add(ambient);
  const directional=['key','fill'].map(()=>{
    const light=new THREE.DirectionalLight(0xffffff,1);
    light.castShadow=true;
    light.shadow.mapSize.set(1024,1024);
    light.shadow.camera.left=-20;
    light.shadow.camera.right=20;
    light.shadow.camera.top=20;
    light.shadow.camera.bottom=-20;
    light.shadow.camera.near=.1;
    light.shadow.camera.far=90;
    scene3.add(light,light.target);
    return light;
  });
  const camera3=new THREE.PerspectiveCamera(50,1,.08,20000);
  let latest=null,disposed=false;
  const size=()=>{
    const bounds=canvas.getBoundingClientRect();
    const width=Math.max(1,Math.round(bounds.width||canvas.clientWidth||640));
    const height=Math.max(1,Math.round(bounds.height||canvas.clientHeight||360));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(width,height,false);
    camera3.aspect=width/height;
    // Match the focal length of the original Framefield projection.
    camera3.fov=2*Math.atan(height/(2*Math.min(width,height)*1.12))*180/Math.PI;
    camera3.updateProjectionMatrix();
    return {width,height};
  };
  function clearMeshes(){
    for(const mesh of root.children) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    root.clear();
  }
  function draw(payload){
    if(disposed)return;
    latest=payload;
    const {project,frame,camera}=payload;
    size();
    const drawables=makeGpuDrawables(project,frame);
    clearMeshes();
    for(const item of drawables){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(item.positions,3));
      geometry.computeVertexNormals();
      const m=sanitizeMaterial(item.material);
      const material=new THREE.MeshStandardMaterial({
        color:item.color,
        roughness:m.roughness,
        metalness:m.metalness,
        emissive:item.color,
        emissiveIntensity:m.emission,
        side:THREE.DoubleSide,
      });
      const mesh=new THREE.Mesh(geometry,material);
      mesh.userData.framefieldId=item.id;
      mesh.position.set(...item.pose.position);
      mesh.rotation.order='ZYX'; // Framefield evaluates local X, then Y, then Z.
      mesh.rotation.set(...item.pose.rotation.map(degrees=>degrees*Math.PI/180));
      mesh.scale.set(...item.pose.scale);
      mesh.castShadow=true;
      mesh.receiveShadow=true;
      root.add(mesh);
    }
    const lights=sanitizeLighting(project.lighting);
    ambient.intensity=lights.ambient*1.2;
    for(let i=0;i<directional.length;i++){
      const spec=lights[['key','fill'][i]],light=directional[i];
      light.visible=spec.enabled;
      light.color.set(spec.color);
      light.intensity=spec.intensity;
      light.position.set(...spec.direction.map(value=>value*10));
      light.target.position.set(0,0,0);
      light.target.updateMatrixWorld();
    }
    scene3.background=new THREE.Color(project.renderSettings?.background||'#0c1526');
    const {yaw,pitch,distance,target}=camera;
    camera3.position.set(
      target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
      target[1]+Math.sin(pitch)*distance,
      target[2]+Math.cos(yaw)*Math.cos(pitch)*distance
    );
    camera3.lookAt(...target);
    renderer.render(scene3,camera3);
  }
  const resizeObserver=new ResizeObserver(()=>{
    if(!latest||disposed)return;
    try{draw(latest);}catch(error){onError(error);}
  });
  resizeObserver.observe(canvas);
  return {draw,dispose(){
    disposed=true;
    resizeObserver.disconnect();
    canvas.removeEventListener('webglcontextlost',onContextLost);
    clearMeshes();
    for(const light of directional){light.shadow.dispose();}
    renderer.dispose();
    renderer.forceContextLoss();
  }};
}
