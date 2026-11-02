import {validNativeFleetRoster} from './native-fleet-roster.js';
import {validNativePortEconomyHistory} from './native-port-economy-history.js';
import {validNativePortActorMemory} from './native-port-actor-memory.js';
// Shared browser-native checkpoint admission for Korean-source-shaped state.
// The original KOUKAI2.DAT bytes remain immutable: these are bounded in-memory
// web checkpoint invariants, NOT claims of DOS save-format arithmetic parity.
export const NATIVE_CHECKPOINT_CASH_CAP=600_000_000;
const between=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const u8=n=>between(n,0,255);
const u16=n=>between(n,0,65535);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o??{},k);
const MONTH_DAYS=Object.freeze([31,28,31,30,31,30,31,31,30,31,30,31]);

export function validNativeCheckpointClock(t){
  return !!t&&between(t.year,1501,9999)&&
    between(t.month,1,12)&&
    between(t.day,1,MONTH_DAYS[t.month-1])&&
    between(t.timeTick,0,71)&&
    t.hour===Math.floor(t.timeTick/3)&&
    t.minute===(t.timeTick%3)*20;
}

function validSourceShip(ship,source){
  if(!ship||typeof ship!=='object'||Array.isArray(ship))return false;
  // Only fields actually established in the source-shape fixture are
  // obligatory. Real Korean save records supply all these u16 fields.
  for(const key of ['currentCrew','water','food','lumber','shot','load',
                    'cargo','capacity','maxCrew','requiredCrew']){
    if(own(source,key)&&!u16(ship[key]))return false;
  }
  for(const key of ['power','navigationPercent','lookoutPercent',
                    'sailType','modelId','tacking']){
    if(own(source,key)&&!u8(ship[key]))return false;
  }
  if(own(source,'oared')&&typeof ship.oared!=='boolean')return false;
  if(own(source,'goods')){
    if(!Array.isArray(ship.goods)||!Array.isArray(source.goods)||
       ship.goods.length!==source.goods.length||
       ship.goods.some((g,i)=>!g||!between(g.slot,0,4)||
         g.slot!==i||!u8(g.id)||!u16(g.quantity)))return false;
  }
  return true;
}

function validPortMarketMeta(session,original){
  // Original save slots have portMeta for normal towns and null for
  // shared-map supply ports; later native Port Call can replace it.
  if(!own(original,'portMeta'))return true;
  if(session.port===100)return session.portMeta==null;
  const m=session.portMeta;
  if(!m||!Array.isArray(m.rates)||m.rates.length!==10||
     !m.rates.every(u8))return false;
  return !own(m,'marketId')||u8(m.marketId);
}

export function validateNativeCheckpointSessionEconomy(session,original){
  if(!session||!original||
     !between(session.money,0,NATIVE_CHECKPOINT_CASH_CAP))
    throw new Error('native checkpoint economy/fleet state invalid');
  if(own(original,'bankBalance')&&
     !between(session.bankBalance,-1_000_000,1_000_000))
    throw new Error('native checkpoint economy/fleet state invalid');
  for(const key of ['dayFlags','voyageDay','waterRation','foodRation']){
    if(own(original,key)&&!u8(session[key]))
      throw new Error('native checkpoint economy/fleet state invalid');
  }
  if(!validPortMarketMeta(session,original))
    throw new Error('native checkpoint economy/fleet state invalid');
  // Browser-only source town actor memory travels through town AND sea
  // checkpoint restore, but malformed/unbounded injected actors cannot.
  if(!validNativePortActorMemory(session.portActorMemory))
    throw new Error('native checkpoint port actor history invalid');
  if(!validNativePortEconomyHistory(session.portEconomyHistory))
    throw new Error('native checkpoint port economy history invalid');
  if(own(original,'inventory')){
    if(!Array.isArray(original.inventory)||!Array.isArray(session.inventory)||
       session.inventory.length!==original.inventory.length||
       session.inventory.some(v=>!u8(v)))
      throw new Error('native checkpoint economy/fleet state invalid');
  }
  const ships=session.fleet?.ships,origShips=original.fleet?.ships;
  if(!validNativeFleetRoster(session.fleet)||!Array.isArray(origShips)||
     origShips.length<1||
     !ships.every((ship,i)=>validSourceShip(ship,origShips[Math.min(i,origShips.length-1)])))
    throw new Error('native checkpoint economy/fleet state invalid');
  // A newly purchased ship can legitimately change ship count, so count
  // parity with the initial original slot is NOT enforced. If the source
  // record declares fleet count, the live count must be internally coherent
  // when it is maintained by the browser runtime.
  if(own(session.fleet,'count')&&
     (!between(session.fleet.count,1,10)||
       session.fleet.count!==ships.length))
    throw new Error('native checkpoint economy/fleet state invalid');
  return true;
}
