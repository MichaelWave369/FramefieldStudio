// Read-only, opt-in GPU preview; the working editor always remains Canvas2D.
// SPDX-License-Identifier: MIT
import React,{useEffect,useRef} from 'react';

export default function GpuPreview({scene,frame,camera,onReady,onError}){
  const canvasRef=useRef(null),viewport=useRef(null),latest=useRef(null),
    errorRef=useRef(onError),readyRef=useRef(onReady);
  latest.current={project:scene,frame,camera};
  errorRef.current=onError;
  readyRef.current=onReady;
  useEffect(()=>{
    let cancelled=false,view=null;
    import('./gpuViewport.js').then(({createGpuViewport})=>{
      if(cancelled)return;
      view=createGpuViewport(canvasRef.current,error=>errorRef.current(error));
      viewport.current=view;
      view.draw(latest.current);
      canvasRef.current?.setAttribute('data-rendered-frame',String(latest.current.frame));
      readyRef.current?.();
    }).catch(error=>{if(!cancelled)errorRef.current(error);});
    return ()=>{
      cancelled=true;
      viewport.current=null;
      view?.dispose();
    };
  },[]);
  useEffect(()=>{
    try{
      if(viewport.current){
        viewport.current.draw(latest.current);
        canvasRef.current?.setAttribute('data-rendered-frame',String(latest.current.frame));
      }
    }catch(error){errorRef.current(error);}
  },[scene,frame,camera]);
  return <canvas ref={canvasRef} aria-label="Read-only GPU preview canvas"
    data-testid="gpu-preview-canvas"/>;
}
