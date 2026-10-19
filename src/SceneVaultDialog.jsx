import React,{useState} from 'react';

export function SceneVaultDialog({records,error,onClose,onSave,onRestore,onDownload,onDelete}){
  const [deleteCandidate,setDeleteCandidate]=useState(null);
  return <div className="creator-overlay">
    <section className="creator-dialog vault-dialog" role="dialog" aria-modal="true"
      aria-label="Scene Vault">
      <div className="creator-heading">
        <div><div className="creator-kicker">LOCAL SAFETY NET</div><h2>Scene Vault</h2></div>
        <button className="ghost" onClick={onClose} aria-label="Close Scene Vault">× Close</button>
      </div>
      <p>Keep up to five local checkpoints of your scenes. Framefield makes a
        checkpoint before New, Open JSON and Create Scene. Restoring a checkpoint
        also protects the current scene first.</p>
      <button className="primary" onClick={onSave}>Save current checkpoint</button>
      {error&&<p className="vault-error" role="alert">{error}</p>}
      {!records.length&&<p className="mesh-help">No local checkpoints yet. Save one above, or create a new project to protect your current scene.</p>}
      <div className="vault-records">
        {records.map(item=><article className="vault-record" key={item.id}>
          <div><strong>{item.project.name||'Untitled scene'}</strong>
            <small>{item.reason} · {new Date(item.stamp).toLocaleString()}</small>
            <small>{item.project.objects?.length??0} objects · This browser only</small>
          </div>
          <div className="vault-record-actions">
            <button onClick={()=>onRestore(item.id)}>Restore</button>
            <button onClick={()=>onDownload(item.id)}>Download JSON</button>
            {deleteCandidate===item.id?
              <button className="danger" onClick={()=>{
                onDelete(item.id);setDeleteCandidate(null);
              }} aria-label={'Confirm delete '+item.project.name}>Confirm delete</button>:
              <button className="ghost danger" onClick={()=>setDeleteCandidate(item.id)}
                aria-label={'Delete '+item.project.name}>Delete</button>}
          </div>
        </article>)}
      </div>
      <p className="creator-footnote">Local checkpoints are not cloud backups. They may disappear if
        your browser clears site data. Download JSON for permanent copies.</p>
    </section>
  </div>;
}

export function ReplacementWarning({reason,error,onCancel,onDownload,onProceed}){
  return <div className="creator-overlay">
    <section className="creator-dialog" role="dialog" aria-modal="true"
      aria-label="Project replacement warning">
      <div className="creator-kicker">PROJECT SAFETY</div>
      <h2>Couldn't protect your current scene</h2>
      <p>Framefield tried to make a local checkpoint before {reason.toLowerCase()}, but it failed:
        <strong> {error}</strong></p>
      <p>Your current scene is still open and unchanged. Download its JSON
        before choosing to continue without a checkpoint.</p>
      <div className="creator-actions">
        <button className="primary" onClick={onDownload}>Download current JSON</button>
        <button className="ghost danger" onClick={onProceed}>Replace anyway</button>
        <button className="ghost" onClick={onCancel}>Cancel replacement</button>
      </div>
    </section>
  </div>;
}
