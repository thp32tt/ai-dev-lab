// Korean KOUKAI2.DAT has 100 ordinary-port economy records by ORIGINAL
// catalog ID. The native browser records locally changed rates across
// port voyages. It does NOT create new ports, invent a DOS price formula,
// or serialize these records back into the original DOS save file.
const u8=n=>Number.isSafeInteger(n)&&n>=0&&n<=255;
const u16=n=>Number.isSafeInteger(n)&&n>=0&&n<=65535;
const sourceTag='SOURCE_KOUKAI2_PORT_ECONOMY_IN_NATIVE_BROWSER';
const validArray=(arr,length,valid)=>Array.isArray(arr)&&
 arr.length===length&&arr.every(valid);
export function validNativePortEconomyMeta(meta){
 if(!meta||typeof meta!=='object'||Array.isArray(meta)||
    !u16(meta.economy)||!u8(meta.marketId)||
    !validArray(meta.rates,10,u8))return false;
 for(const key of ['marketInvestment','industry',
   'shipyardInvestment','specialtyBasePrice'])
  if(key in meta&&!u16(meta[key]))return false;
 for(const key of ['specialtyGoodsId','specialtyEconomyThreshold',
   'regionId','secretItem','industryId','pubDrinkId'])
  if(key in meta&&!u8(meta[key]))return false;
 if('offset' in meta&&(!Number.isSafeInteger(meta.offset)||
    meta.offset<0||meta.offset>4*1024*1024))return false;
 if('support' in meta&&!validArray(meta.support,6,u8))return false;
 if('regularItems' in meta&&!validArray(meta.regularItems,3,u8))return false;
 return true;
}
export function validNativePortEconomyHistory(history){
 if(history===undefined)return true;
 if(!history||typeof history!=='object'||Array.isArray(history))return false;
 const keys=Object.keys(history);
 if(keys.length>100)return false;
 return keys.every(key=>{
  const id=Number(key),record=history[key];
  return u8(id)&&id<100&&String(id)===key&&
    record&&typeof record==='object'&&!Array.isArray(record)&&
    record.source===sourceTag&&validNativePortEconomyMeta(record.meta);
 });
}
function currentCatalogId(session){
 const id=session?.portCatalogId;
 if(u8(id)&&id<130)
  return (id>=100?100:id)===session.port?id:null;
 return u8(session?.port)&&session.port<100?session.port:null;
}
export function prepareNativePortEconomyContinuity(previous,target){
 if(!previous||!u8(target?.id)||target.id>129||
    !validNativePortEconomyHistory(previous.portEconomyHistory))
  throw new Error('native port economy history invalid');
 const oldId=currentCatalogId(previous);
 const memory=structuredClone(previous.portEconomyHistory??{});
 // The current portMeta is the live mutable market (buy/sell adjusts rates).
 // Save only original ordinary port meta that is source-shaped and uniquely
 // tied to its catalog identity. Shared supply map #100 has no such record.
 if(oldId!==null&&oldId<100&&previous.portMeta!=null){
  if(!validNativePortEconomyMeta(previous.portMeta))
   throw new Error('native port economy source invalid');
  memory[String(oldId)]={source:sourceTag,
   meta:structuredClone(previous.portMeta)};
 }
 const cached=target.id<100?memory[String(target.id)]:null;
 const newMeta=cached?.meta??target.meta??null;
 if(newMeta!=null&&!validNativePortEconomyMeta(newMeta))
  throw new Error('native destination port economy invalid');
 return {
  portEconomyHistory:memory,
  portMeta:newMeta==null?null:structuredClone(newMeta),
  economyStatus:cached?'NATIVE_PORT_TRADE_ECONOMY_RESTORED':
    newMeta?'ORIGINAL_SOURCE_PORT_ECONOMY':'SUPPLY_PORT_ECONOMY_UNAVAILABLE'
 };
}
