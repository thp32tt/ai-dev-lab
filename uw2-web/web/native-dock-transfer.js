// Browser-only two-ship transfer of REAL Korean source fleet supplies.
// This does not claim original DOS dock transfer prices or spare fleet rules.
import {validNativeFleetRoster} from './native-fleet-roster.js';
import {RESOURCE_KEYS,resourceUnitsAboard,shipCargoFree} from './buildings.js';
const U16=65535,int=n=>Number.isSafeInteger(n)&&n>=0&&n<=U16;
function sourceShip(s){
 return !!s&&['cargo','load','water','food','lumber','shot','currentCrew','maxCrew']
  .every(k=>int(s[k]))&&s.currentCrew<=s.maxCrew&&
  Array.isArray(s.goods)&&s.goods.length>=1&&s.goods.length<=5&&
  s.goods.every((g,i)=>g&&g.slot===i&&int(g.quantity)&&int(g.id)&&g.id<=255);
}
const refused=reason=>Object.freeze({quantity:0,reason});
function sourcePair(session,fromIndex,toIndex,resource){
 const f=session?.fleet;
 if(!validNativeFleetRoster(f)||!f.ships.every(sourceShip))
  return refused('source-fleet-invalid');
 if(!Number.isSafeInteger(fromIndex)||!Number.isSafeInteger(toIndex)||
  fromIndex<0||toIndex<0||fromIndex>=f.ships.length||
  toIndex>=f.ships.length||fromIndex===toIndex)
  return refused('source-ship-index-invalid');
 if(!RESOURCE_KEYS.includes(resource))return refused('source-resource-invalid');
 return {a:f.ships[fromIndex],b:f.ships[toIndex]};
}
export function nativeDockTransferMaximum(session,fromIndex,toIndex,resource){
 const pair=sourcePair(session,fromIndex,toIndex,resource);
 if(pair.reason)return 0;
 const {a,b}=pair,atSource=resourceUnitsAboard(a,resource);
 const remaining=resource==='water'||resource==='food'
  ?Math.floor((U16-b[resource])/10):U16-b[resource];
 return Math.max(0,Math.min(atSource,remaining,shipCargoFree(b),
  a.load,U16-b.load));
}
export function transferNativeDockSupply(session,fromIndex,toIndex,resource,requested){
 const pair=sourcePair(session,fromIndex,toIndex,resource);
 if(pair.reason)return pair;
 if(!Number.isSafeInteger(requested)||requested<=0||requested>U16)
  return refused('source-quantity-invalid');
 const quantity=Math.min(requested,nativeDockTransferMaximum(
  session,fromIndex,toIndex,resource));
 if(!quantity)return refused('source-transfer-capacity');
 const {a,b}=pair,unit=resource==='water'||resource==='food'?10:1;
 // Preflight done on the WHOLE fleet. No partial mutation or money changes.
 a[resource]-=quantity*unit;b[resource]+=quantity*unit;
 a.load-=quantity;b.load+=quantity;
 return Object.freeze({quantity,fromIndex,toIndex,resource,
  source:'BROWSER_NATIVE_DOCK_TRANSFER_NOT_ORIGINAL_DOS_RULE'});
}
