import React,{useEffect,useRef,useState} from 'react';
import {GUIDE_STEPS,getGuideStep} from './creatorGuide.js';

export default function QuickStartGuide({onClose,onJump}){
  const [stepIndex,setStepIndex]=useState(0);
  const closeRef=useRef(null);
  const closeCallback=useRef(onClose);
  closeCallback.current=onClose;
  useEffect(()=>{
    closeRef.current?.focus();
    const key=e=>{if(e.key==='Escape'){e.preventDefault();closeCallback.current();}};
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[]);
  const step=getGuideStep(stepIndex);
  return <div className="creator-overlay">
    <section className="creator-dialog guide-dialog" role="dialog"
      aria-modal="true" aria-label="Quick Start guide" aria-describedby="guide-instruction">
      <div className="creator-heading">
        <div>
          <div className="creator-kicker">WELCOME TO FRAMEFIELD STUDIO</div>
          <h2>Quick Start</h2>
        </div>
        <button ref={closeRef} className="ghost" onClick={onClose} aria-label="Close Quick Start">× Close</button>
      </div>
      <div className="guide-step-progress" aria-label="Quick Start progress">
        {GUIDE_STEPS.map((item,i)=><button key={item.id}
          className={'guide-dot '+(i===stepIndex?'current':'')} aria-current={i===stepIndex?'step':undefined}
          aria-label={'Go to step '+(i+1)+': '+item.title}
          onClick={()=>setStepIndex(i)} />)}
      </div>
      <div className="guide-story" aria-live="polite">
        <div className="creator-kicker">{step.eyebrow}</div>
        <h3>{step.title}</h3>
        <p id="guide-instruction">{step.description}</p>
        <div className="guide-hint">{step.hint}</div>
      </div>
      <div className="guide-controls">
        <button className="ghost" onClick={()=>setStepIndex(i=>Math.max(0,i-1))}
          disabled={stepIndex===0}>← Previous</button>
        <button className="ghost" onClick={()=>setStepIndex(i=>Math.min(GUIDE_STEPS.length-1,i+1))}
          disabled={stepIndex===GUIDE_STEPS.length-1}>Next →</button>
      </div>
      <div className="guide-bottom">
        <button className="primary" onClick={()=>onJump(step.action)}>{step.actionLabel}</button>
        <a href="https://github.com/MichaelWave369/FramefieldStudio/blob/main/docs/USER_MANUAL.md"
          target="_blank" rel="noopener noreferrer">Full User Manual ↗</a>
      </div>
      <p className="creator-footnote">No account, assets, or cloud connection required. Your edits stay on your device.</p>
    </section>
  </div>;
}
