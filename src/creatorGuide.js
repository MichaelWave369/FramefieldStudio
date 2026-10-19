// Original Framefield creator-tour content. Every action maps to a real editor
// navigation or save operation; this dialog never changes project geometry.
export const GUIDE_STEPS=Object.freeze([
  {
    id:'starter',eyebrow:'01 / CREATE',title:'Start with something alive',
    description:'Choose an example that already has objects, materials, lights, and animation. Or keep your current scene.',
    hint:'The starter gallery can also download a clean example project without replacing the current scene.',
    action:'starter',actionLabel:'Open Starter Scenes'
  },
  {
    id:'model',eyebrow:'02 / MODEL',title:'Shape the scene',
    description:'Select an object, convert a primitive into an editable mesh, then use Vertex, Edge, and Face tools. Extrude, Inset, and Bevel appear in Face mode.',
    hint:'Use Undo if an experiment does not work out. Modifiers can smooth and mirror the preview without changing the source mesh.',
    action:'object',actionLabel:'Open Object Inspector'
  },
  {
    id:'animate',eyebrow:'03 / ANIMATE',title:'Make motion feel intentional',
    description:'Set transform keys in the timeline. Switch to Graph Editor for independent motion channels and ease handles.',
    hint:'Press Space to preview the animation, K to add a keyframe, and G/R/S for transform tools.',
    action:'graph',actionLabel:'Open Graph Editor'
  },
  {
    id:'light',eyebrow:'04 / LIGHT',title:'Set the mood',
    description:'Choose roughness, metalness, and emission per object, then balance the scene with Ambient, Key, and Fill lights.',
    hint:'The Canvas2D preview approximates lights and highlights; it does not calculate ray-traced shadows.',
    action:'lighting',actionLabel:'Open Lighting Inspector'
  },
  {
    id:'render',eyebrow:'05 / RENDER',title:'Direct the final shot',
    description:'Save a shot camera that stays separate from editor navigation. Choose render dimensions, export one clean PNG or a frame-sequence ZIP.',
    hint:'The export uses the same modified geometry and animation curves shown in the editor.',
    action:'render',actionLabel:'Open Camera/Render'
  },
  {
    id:'save',eyebrow:'06 / KEEP',title:'Keep your work yours',
    description:'Your browser automatically keeps a local working draft and offers recovery. Download JSON to keep a durable, portable project.',
    hint:'Browser storage may be cleared or unavailable. A downloaded project file is your real backup.',
    action:'save',actionLabel:'Download Project JSON'
  }
]);
export function getGuideStep(index){
  if(!Number.isInteger(index))return GUIDE_STEPS[0];
  return GUIDE_STEPS[Math.min(GUIDE_STEPS.length-1,Math.max(0,index))];
}
