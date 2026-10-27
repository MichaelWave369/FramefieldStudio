import React from 'react';

// Deliberately separate the file read/validation step from editor mutation.
export default function GlbImportDialog({candidate,onConfirm,onCancel}){
  if(!candidate)return null;
  const {object,warnings,byteLength,previewColor}=candidate;
  return <div className="creator-overlay">
    <section className="creator-dialog" role="dialog" aria-modal="true"
      aria-label="Review local GLB mesh import">
      <div className="creator-kicker">LOCAL GLB IMPORT / REVIEW REQUIRED</div>
      <h2>Import this static mesh?</h2>
      <p>Nothing has been added to your project yet. Confirm to add one editable
        object. Existing objects, animation and Undo history will remain intact.</p>
      <div className="creator-draft" style={{display:'grid',gap:6}}>
        <strong>{object.name}</strong>
        <span>{object.geometry.vertices.length} vertices · {object.geometry.faces.length} triangles · {byteLength} bytes</span>
        <span>Original file: {object.glbSource.fileName}</span>
        {previewColor&&<span>Approximate flat material color: <strong style={{color:previewColor}}>{previewColor}</strong></span>}
        <span>SHA-256 (original bytes):</span>
        <code style={{overflowWrap:'anywhere',fontSize:11}}>{object.glbSource.sha256}</code>
      </div>
      <p><strong>Supported:</strong> one static triangle mesh. Imported geometry
        uses Framefield's current Canvas2D renderer and existing object transform keyframes.</p>
      <p><strong>Material preview:</strong> only an optional uniform glTF
        baseColorFactor is approximated as one flat color. Full PBR materials,
        texture maps, UV maps, transparency, rigging, imported animation,
        multiple meshes and GLB node transformations are not supported.
        Source appearance may differ substantially from another studio.</p>
      {warnings?.length>0&&<p>{warnings.join(' ')}</p>}
      <p>Only import models that you have permission to use. A matching hash
        proves byte identity, not a right to redistribute an asset.</p>
      <div className="creator-actions">
        <button className="primary" onClick={onConfirm}>Add mesh to scene</button>
        <button className="ghost" onClick={onCancel}>Cancel · keep scene unchanged</button>
      </div>
      <p className="creator-footnote">All file parsing and hashing happens locally.
        No automatic upload, publishing, or XR launch.</p>
    </section>
  </div>;
}
