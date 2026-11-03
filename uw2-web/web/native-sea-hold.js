// Browser sea gesture: a tap remains a single command; a long hold repeats
// the existing source-bound game transaction. No game state changes here.
export function createNativeSeaHold({onRepeat,holdMs=360,repeatMs=180,clock=globalThis}={}){
 if(typeof onRepeat!=='function'||![holdMs,repeatMs].every(n=>
  Number.isSafeInteger(n)&&n>=1&&n<=2000)||
  !['setTimeout','clearTimeout','setInterval','clearInterval'].every(k=>
   typeof clock?.[k]==='function'))throw new TypeError('invalid sea hold timers/command');
 let active=null,suppress=false;
 const clear=()=>{
  if(active){clock.clearTimeout(active.timer);clock.clearInterval(active.interval);active=null;}
 };
 const cancel=()=>{clear();suppress=false;};
 const begin=(pointerId,point)=>{
  if(!Number.isSafeInteger(pointerId)||pointerId<0||!point||
     !Number.isFinite(point.x)||!Number.isFinite(point.y))return false;
  clear();suppress=false;
  const p={pointerId,point:Object.freeze({x:point.x,y:point.y}),
    triggered:false,timer:null,interval:null};
  active=p;
  const tick=()=>{
   if(active!==p)return;
   try{if(onRepeat(p.point)===false)clear();}
   catch(error){clear();throw error;}
  };
  p.timer=clock.setTimeout(()=>{
   if(active!==p)return;
   p.triggered=true;tick();
   if(active===p)p.interval=clock.setInterval(tick,repeatMs);
  },holdMs);
  return true;
 };
 const release=pointerId=>{
  if(!active||active.pointerId!==pointerId)return false;
  const triggered=active.triggered;clear();
  if(triggered)suppress=true;
  return triggered;
 };
 const consumeClick=()=>{
  if(!suppress)return false;
  suppress=false;return true;
 };
 return Object.freeze({begin,release,cancel,consumeClick,
  snapshot:()=>Object.freeze({armed:!!active,triggered:!!active?.triggered,
    suppressNextClick:suppress})});
}
