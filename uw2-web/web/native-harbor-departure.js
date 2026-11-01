import {findNearestSea,SeaRuntime,WORLD_CHIP_W,WORLD_CHIP_H} from './world-map.js';
import {harborDepartureStatus,consumeDepartureDay,advanceDateTicks} from './buildings.js';
import {rolloverPubDailyRecruitment} from './pub.js';
import {applyBankInterestCrossings} from './bank.js';

// This is a native JavaScript browser-game transaction. It does not run
// DOS/8086 instructions or invent original DOS departure behavior.
// First locate a source-backed, navigable 2x2 sea tile, then stage ALL
// session/time/provision/interest changes. Nothing mutates the live save,
// town, fleet or scene until the caller explicitly accepts the result.
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function prepareNativeHarborDeparture({session,worldAssets,windCur=null,visitTicks}={}){
  const reject=reason=>({allowed:false,reason});
  if(!session||!worldAssets?.cells||!worldAssets?.quad||
     !int(session.port,0,100)||!session.portWorld||
     !int(session.portWorld.x,0,WORLD_CHIP_W-1)||
     !int(session.portWorld.y,0,WORLD_CHIP_H-1))
    return reject('source-harbor-invalid');
  // Actual UI builds a 2..4 tick visit when entering the harbor. A broken
  // or synthetic visit duration must never silently become free time.
  if(!int(visitTicks,2,4))return reject('visit-clock-invalid');
  const clearance=harborDepartureStatus(session);
  if(!clearance.allowed)return reject(clearance.reason);
  if(!int(session.dayFlags,0,255)||
     !int(session.bankBalance,-1_000_000,1_000_000))
    return reject('source-session-invalid');
  let anchor;
  try {
    anchor=findNearestSea(worldAssets,session.portWorld.x,
      session.portWorld.y,40);
  } catch {
    return reject('source-sea-unavailable');
  }
  if(!anchor)return reject('source-sea-unavailable');

  let next;
  try { next=structuredClone(session); }
  catch { return reject('source-session-uncloneable'); }
  const before={...next.dateTime};
  if(!advanceDateTicks(next.dateTime,visitTicks))
    return reject('visit-clock-invalid');
  rolloverPubDailyRecruitment(next,before,next.dateTime);
  const interest=applyBankInterestCrossings(next,before,next.dateTime);
  if(interest.length)next.lastBankInterest=interest.at(-1);
  const provision=consumeDepartureDay(next);
  if(!provision.consumed)return reject('departure-provision-invalid');
  // Keep the sea renderer's live fleet pointer tied to the staged session.
  // No time or supply is charged if the source SeaRuntime fails creation.
  let sea;
  try {
    sea=new SeaRuntime(worldAssets,anchor,windCur,
      next.dateTime.month,next.fleet,next.dateTime);
  } catch {
    return reject('sea-runtime-unavailable');
  }
  return {allowed:true,session:next,sea,visitTicks,
    source:'NATIVE_HARBOR_DEPARTURE_SOURCE_SEA_GEOMETRY'};
}
