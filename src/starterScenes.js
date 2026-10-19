// Framefield original starter scenes. No downloaded assets, no outside models.
import {demoScene,makeObject,pose,putKey} from './scene.js';
import {sanitizeShotCamera,sanitizeRender} from './shot.js';
import {sanitizeLighting} from './lighting.js';
export const STARTER_SCENES=Object.freeze([
  {id:'first-motion',title:'First Motion',description:'The original cube orbit and floating sphere. Explore the timeline and graph.'},
  {id:'turntable',title:'Turntable',description:'A polished object rotating on its display stand.'},
  {id:'bounce',title:'Bouncing Ball',description:'A bright bouncing sphere with editable keyframes and easing.'},
  {id:'showcase',title:'Product Showcase',description:'A lit pedestal stage with a glowing centerpiece and camera framing.'}
]);
const makePoseKey=(frame,position,rotation=[0,0,0],scale=[1,1,1])=>({frame,...pose(position,rotation,scale)});
const makeBase=(name,duration=120)=>({
  version:1,name,fps:24,duration,objects:[],
  lighting:sanitizeLighting(null),shotCamera:sanitizeShotCamera(null),
  renderSettings:sanitizeRender(null)
});
export function createStarter(id){
  if(id==='first-motion')return demoScene();
  if(id==='turntable'){
    const s=makeBase('Turntable Study');
    const item=makeObject('box',0);
    item.name='Rotating Sculpture';
    item.color='#f3ac81';
    item.material={roughness:.18,metalness:.55,emission:0};
    item.keyframes=[makePoseKey(0,[0,.3,0],[0,0,0]),
      makePoseKey(60,[0,.3,0],[0,180,0]),
      makePoseKey(120,[0,.3,0],[0,360,0])];
    item.modifiers=[{type:'subdivide',enabled:true,levels:1}];
    const stand=makeObject('cylinder',1);
    stand.name='Display Stand';stand.color='#4d667f';
    stand.keyframes=[makePoseKey(0,[0,-.7,0],[0,0,0],[1.7,.28,1.7])];
    s.objects=[item,stand];
    s.renderSettings={...s.renderSettings,background:'#0d172b'};
    return s;
  }
  if(id==='bounce'){
    const s=makeBase('Bouncing Ball',96);
    const ball=makeObject('sphere',0);
    ball.name='Bounce';
    ball.color='#ffab76';
    ball.material={roughness:.3,metalness:0,emission:.04};
    ball.keyframes=[
      makePoseKey(0,[0,.15,0]),makePoseKey(12,[0,1.8,0]),
      makePoseKey(24,[0,.15,0],[0,0,0],[1.15,.78,1.15]),
      makePoseKey(36,[0,1.35,0]),makePoseKey(48,[0,.15,0]),
      makePoseKey(60,[0,1.8,0]),makePoseKey(72,[0,.15,0]),
      makePoseKey(84,[0,1.35,0]),makePoseKey(96,[0,.15,0])
    ];
    for(const k of ball.keyframes.slice(0,-1))
      k.curves={'position.1':[.42,0,.58,1]};
    const floor=makeObject('box',1);floor.name='Floor';
    floor.color='#6d86ba';floor.keyframes=[makePoseKey(0,[0,-.75,0],[0,0,0],[3,.18,2.5])];
    s.objects=[ball,floor];return s;
  }
  if(id==='showcase'){
    const s=makeBase('Product Showcase');
    s.lighting=sanitizeLighting({ambient:.32,
      key:{color:'#ffe0ba',intensity:1.7,direction:[.5,1,.9]},
      fill:{color:'#77bbff',intensity:.85,direction:[-1,.4,-.7]}});
    s.renderSettings={...s.renderSettings,background:'#101323',width:960,height:540};
    s.shotCamera=sanitizeShotCamera({yaw:.5,pitch:.28,distance:8.5,target:[0,0,0]});
    const display=makeObject('pyramid',0);display.name='Beacon';
    display.color='#92abff';
    display.material={roughness:.15,metalness:.46,emission:.16};
    display.keyframes=[makePoseKey(0,[0,.15,0]),makePoseKey(60,[0,.45,0],[0,180,0]),
      makePoseKey(120,[0,.15,0],[0,360,0])];
    const plinth=makeObject('cylinder',1);plinth.name='Plinth';
    plinth.color='#46557c';plinth.material={roughness:.42,metalness:.22,emission:0};
    plinth.keyframes=[makePoseKey(0,[0,-.8,0],[0,0,0],[1.8,.23,1.8])];
    s.objects=[display,plinth];return s;
  }
  throw Error('Unknown starter scene.');
}
