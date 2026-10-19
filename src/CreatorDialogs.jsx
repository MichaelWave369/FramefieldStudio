import React from 'react';
import {STARTER_SCENES} from './starterScenes.js';
export function RecoveryPrompt({draft,onRestore,onDiscard,onBackup}){
  if(!draft)return null;
  const date=Number.isFinite(draft.savedAt)?new Date(draft.savedAt).toLocaleString():'unknown time';
  return <div className="creator-overlay">
    <section className="creator-dialog" role="dialog" aria-modal="true" aria-label="Restore local autosave">
      <div className="creator-kicker">LOCAL RECOVERY</div>
      <h2>{draft.error?'Stored draft needs attention':'Pick up where you left off'}</h2>
      <p>{draft.error
        ?'Your browser contains an unreadable draft: '+draft.error+'. Download its raw backup before discarding.'
        :'A previous scene was saved in this browser. Framefield has not loaded or replaced anything automatically.'}</p>
      {!draft.error&&<div className="creator-draft">
        <strong>{draft.project.name}</strong>
        <span>{draft.project.objects.length} objects · Saved {date}</span>
      </div>}
      <div className="creator-actions">
        {!draft.error&&<button className="primary" onClick={onRestore}>Restore saved scene</button>}
        {draft.raw&&<button className="ghost" onClick={onBackup}>Download draft backup</button>}
        <button className="ghost danger" onClick={onDiscard}>Discard local draft</button>
      </div>
      <p className="creator-footnote">Stored only in this browser origin. For durable backups, download project JSON.</p>
    </section>
  </div>;
}
export function StarterPicker({onClose,onSelect,onDownload}){
  return <div className="creator-overlay">
    <section className="creator-dialog starter-dialog" role="dialog" aria-modal="true" aria-label="Starter scenes">
      <div className="creator-heading">
        <div><div className="creator-kicker">FRAMEFIELD CREATOR WORKFLOW</div>
          <h2>Choose a starter scene</h2></div>
        <button className="ghost" onClick={onClose} aria-label="Close starter scenes">× Close</button>
      </div>
      <p>Try a ready-made project, then customize its meshes, animation curves, camera and lighting.
        Loading a starter replaces the active scene, with Undo available.</p>
      <div className="starter-grid">
        {STARTER_SCENES.map(scene=><article className="starter-card" key={scene.id}>
          <strong>{scene.title}</strong><p>{scene.description}</p>
          <div className="starter-card-actions">
            <button className="primary" onClick={()=>onSelect(scene.id)}
              aria-label={'Create '+scene.title}>Create scene</button>
            <button className="ghost" onClick={()=>onDownload(scene.id)}
              aria-label={'Download '+scene.title+' JSON'}>Download JSON</button>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
