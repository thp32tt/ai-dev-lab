// Browser-native Korean GRAPH #5 town HUD dynamic text only.
// All fixed labels/artwork are pixels from the owner's original GRAPH.DAT.
// Values below are taken from the active SHA-verified save COPY after native
// gameplay transactions. No write to KOUKAI2.DAT or invented save fields.
export const GOLD_COINS_PER_BAR = 10000;
const unsigned=(v,max=0xffffffff)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:null;
const entry=(name,text,x,y,scale=1)=>Object.freeze({name,text:String(text),x,y,scale});
export function originalTownHudEntries(slot){
 if(!slot||typeof slot!=='object')return Object.freeze([]);
 const out=[];
 const put=(name,text,x,y,scale=1)=>{
  if(text!==null)out.push(entry(name,text,x,y,scale));
 };
 // GRAPH #5 original Korean screenshot: date is in the upper-right
 // scroll (x=480..639). Left status labels begin at x=8, so values
 // must start to their RIGHT, not print across the original glyphs.
 const date=slot.dateTime;
 if(date&&unsigned(date.year,9999)!==null&&
    unsigned(date.month,12)!==null&&date.month>=1&&
    unsigned(date.day,31)!==null&&date.day>=1){
  put('ad-date',String(date.year).padStart(4,'0')+'.'+
   String(date.month).padStart(2,'0')+'.'+
   String(date.day).padStart(2,'0'),500,18);
 }
 const coins=unsigned(slot.money);
 if(coins!==null){
  // GRAPH #5 explicitly has separate original labels for gold COINS/BARS.
  put('gold-coins',coins%GOLD_COINS_PER_BAR,44,321);
  put('gold-bars',Math.floor(coins/GOLD_COINS_PER_BAR),44,355);
 }
 // Original stores three distinct fame tracks. The left HUD's single
 // prominent value is the largest recorded track, NOT their invented sum.
 const fame=[
  unsigned(slot.tradeFame,65535),
  unsigned(slot.pirateFame,65535),
  unsigned(slot.adventureFame,65535)
 ];
 const available=fame.filter(value=>value!==null);
 if(available.length){
  // GRAPH #5 has ONE fame field on the left, not three additional
  // trade/pirate/adventure labels in the right-side economy panel.
  put('fame-maximum',Math.max(...available),44,256);
 }

 const meta=slot.portMeta;
 if(meta&&typeof meta==='object'){
  const fields=[
   ['commerce-value',meta.economy,82],
   ['commerce-investment',meta.marketInvestment,114],
   ['industry-value',meta.industry,146],
   ['industry-investment',meta.shipyardInvestment,178],
  ];
  for(const [name,value,y] of fields){
   const valid=unsigned(value,65535);
   if(valid!==null)put(name,valid,581,y,0.75);
  }
  if(Array.isArray(meta.rates)&&meta.rates.length===10&&
      meta.rates.every(v=>unsigned(v,255)!==null)){
   // Average of the ten exact source market-rate percentages.
   put('average-market-rate',
    Math.floor(meta.rates.reduce((sum,v)=>sum+v,0)/10),565,229,0.75);
  }
 }
 return Object.freeze(out);
}
