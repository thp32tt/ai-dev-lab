import {SeaRuntime} from './world-map.js';
import {validNativeSeaMotion} from './native-sea-motion.js';
import {advanceDateTicks,consumeDepartureDay,validNativeVoyageFleet} from './buildings.js';
import {rolloverPubDailyRecruitment} from './pub.js';
import {applyBankInterestCrossings} from './bank.js';

// One genuine browser-native 20-minute voyage step. Preserve the original
// session and runtime on failed movement, supply or calendar admission.
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const keys=['year','month','day','timeTick','hour','minute'];
const sameTime=(a,b)=>keys.every(k=>a?.[k]===b?.[k]);
export function advanceNativeSeaVoyageStep({session,runtime}={}){
 const hold=reason=>({advanced:false,reason});
 if(!(runtime instanceof SeaRuntime)||!session||
   runtime.fleet!==session.fleet||
   !sameTime(runtime.dateTime,session.dateTime)||
   runtime.month!==runtime.dateTime?.month||
   !int(session.money,0,600_000_000)||
   !int(session.bankBalance,-1_000_000,1_000_000)||
   !int(session.dayFlags,0,255)||!validNativeVoyageFleet(session)||
   !int(runtime.heading,0,7)||!int(runtime.steps,0,1_000_000_000)||
   !int(runtime.ticks,0,1_000_000_000)||
   !validNativeSeaMotion(runtime,runtime.assets))
  return hold('native-voyage-state-invalid');
 const expected={...runtime.dateTime};
 if(!advanceDateTicks(expected,1))return hold('native-voyage-clock-invalid');
 const before={...runtime.dateTime};
 // Clone only source-shaped mutable gameplay fields, not 33KB original
 // save-page bytes, immutable asset banks or the entire world map.
 const next={...session,dateTime:{...session.dateTime},
   fleet:{...session.fleet,ships:session.fleet.ships.map(sh=>({...sh}))}};
 let sea,moved;
 try{
   sea=new SeaRuntime(runtime.assets,{x:runtime.x,y:runtime.y},
     runtime.windRaw,runtime.month,next.fleet,runtime.dateTime);
   for(const key of ['heading','steps','ticks','accX','accY','lastEvent'])
     sea[key]=runtime[key];
   const velocity=sea.projectedVelocity();
   if(!Number.isFinite(velocity.x)||!Number.isFinite(velocity.y))
     return hold('native-voyage-velocity-invalid');
   moved=sea.move();
 }catch{return hold('native-voyage-movement-invalid');}
 if(!sameTime(sea.dateTime,expected)||sea.month!==expected.month||
   !int(sea.steps,0,1_000_000_000)||!int(sea.ticks,0,1_000_000_000)||
   !Number.isFinite(sea.accX)||!Number.isFinite(sea.accY))
  return hold('native-voyage-clock-diverged');
 next.dateTime={...sea.dateTime};
 const dayChanged=before.year!==next.dateTime.year||
   before.month!==next.dateTime.month||before.day!==next.dateTime.day;
 if(dayChanged){
   const consumed=consumeDepartureDay(next);
   if(!consumed.consumed)return hold('native-voyage-provision-invalid');
   rolloverPubDailyRecruitment(next,before,next.dateTime);
   next.lastSeaProvisionDate={
     year:next.dateTime.year,month:next.dateTime.month,day:next.dateTime.day
   };
 }
 const interest=applyBankInterestCrossings(next,before,next.dateTime);
 if(interest.length)next.lastBankInterest=interest.at(-1);
 return {advanced:true,moved,sea,session:next,dayChanged,reason:sea.lastEvent};
}
