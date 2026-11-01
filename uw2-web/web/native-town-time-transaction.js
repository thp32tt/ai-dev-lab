import {advanceDateTicks,lodgeCheckIn} from './buildings.js';
import {rolloverPubDailyRecruitment} from './pub.js';
import {applyBankInterestCrossings} from './bank.js';
import {validNativeCheckpointClock} from './native-checkpoint-integrity.js';

// Native browser town visit/inn transition: prepare bank, daily pub flags
// and calendar before the application commits any game-state fields.
// This does not claim unverified original DOS lodging rules.
const valid=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const hold=reason=>({allowed:false,reason});
export function prepareNativeTownTimeTransition({session,kind,ticks}={}){
 if(!session||!validNativeCheckpointClock(session.dateTime)||
    !valid(session.money,0,600_000_000)||
    !valid(session.bankBalance,-1_000_000,1_000_000)||
    !valid(session.dayFlags,0,255))
  return hold('native-town-calendar-state-invalid');
 if(kind!=='visit'&&kind!=='lodge')
  return hold('native-town-calendar-kind-invalid');
 if(kind==='visit'&&!valid(ticks,2,4))
  return hold('native-town-visit-ticks-invalid');
 const before={...session.dateTime};
 const next={dateTime:{...before},money:session.money,
   bankBalance:session.bankBalance,dayFlags:session.dayFlags};
 try{
   const after=kind==='visit'?advanceDateTicks(next.dateTime,ticks):
     lodgeCheckIn(next.dateTime);
   if(!after||!validNativeCheckpointClock(next.dateTime))
     return hold('native-town-calendar-overflow');
   rolloverPubDailyRecruitment(next,before,next.dateTime);
   const events=applyBankInterestCrossings(next,before,next.dateTime);
   if(!valid(next.bankBalance,-1_000_000,1_000_000)||
      !valid(next.dayFlags,0,255))
     return hold('native-town-economy-overflow');
   const updates={dateTime:next.dateTime,bankBalance:next.bankBalance,
     dayFlags:next.dayFlags};
   if(events.length)updates.lastBankInterest=events.at(-1);
   return {allowed:true,updates,events,kind,
     source:'NATIVE_BROWSER_TOWN_CALENDAR_ATOMIC'};
 }catch{return hold('native-town-calendar-transition-invalid');}
}
