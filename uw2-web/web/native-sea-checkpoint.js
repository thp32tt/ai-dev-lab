import {SeaRuntime} from './world-map.js';
import {validNativeSeaMotion} from './native-sea-motion.js';
import {validateNativeCheckpointSessionEconomy,validNativeCheckpointClock} from './native-checkpoint-integrity.js';
// Independent JS/Web Canvas runtime checkpoint, NOT a DOS save-state,
// DOS/8086 emulator serialization or reverse-engineered port=FF record.
export const NATIVE_SEA_CHECKPOINT_KEY='uw2-web-native-sea-checkpoint-v1';
export const NATIVE_CHECKPOINT_CHOICE_KEY='uw2-web-native-checkpoint-choice-v1';
const MAX=256*1024;
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const timeValid=validNativeCheckpointClock;
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async text=>hex(await globalThis.crypto.subtle.digest(
 'SHA-256',new TextEncoder().encode(text)));
export function validateNativeSeaCheckpoint(payload,{
 sourceSha256,sourceSlots,worldAssets,portCatalog
}={}){
 if(!payload||payload.version!==1||payload.kind!=='native-sea'||
    !/^[0-9a-f]{64}$/.test(sourceSha256??'')||
    payload.sourceSha256!==sourceSha256||!Array.isArray(sourceSlots)||
    !Array.isArray(portCatalog)||!worldAssets)
  throw new Error('native sea checkpoint original source/version mismatch');
 const {session,sea}=payload;
 const original=sourceSlots[session?.index];
 if(!session||!original||original.empty||
    !int(session.index,0,9)||session.index!==original.index||
    session.heroId!==original.heroId||
    session.heroName!==original.heroName||
    session.memo!==original.memo||
    JSON.stringify(session.raw)!==JSON.stringify(original.raw))
  throw new Error('native sea checkpoint original save identity invalid');
 if(!int(session.port,0,100))
  throw new Error('native sea checkpoint source fleet/economy invalid');
 validateNativeCheckpointSessionEconomy(session,original);
 const catalogId=session.portCatalogId??session.port;
 const port=portCatalog.find(x=>x.id===catalogId);
 if(!port||port.mapId!==session.port||
    !session.portWorld||port.x!==session.portWorld.x||
    port.y!==session.portWorld.y||port.nation!==session.portWorld.nation||
    port.name!==session.portName)
  throw new Error('native sea checkpoint original port provenance invalid');
 if(!sea||!validNativeSeaMotion(sea,worldAssets)||
    !int(sea.heading,0,7)||!int(sea.steps,0,1000000000)||
    !int(sea.ticks,0,1000000000)||
    !int(sea.month,1,12)||!timeValid(sea.dateTime)||
    sea.month!==sea.dateTime.month||
    !timeValid(session.dateTime)||
    JSON.stringify(session.dateTime)!==JSON.stringify(sea.dateTime)||
    typeof sea.lastEvent!=='string'||sea.lastEvent.length>64||
    sea.flagshipOared!==session.fleet.ships[0].oared)
  throw new Error('native sea checkpoint position/tick/clock/source invalid');
 return {session:structuredClone(session),sea:structuredClone(sea)};
}
export async function saveNativeSeaCheckpoint({storage,sourceSha256,sourceSlots,
 worldAssets,portCatalog,session,sea}){
 if(!storage||typeof storage.setItem!=='function')
  throw new Error('native sea checkpoint storage unavailable');
 // The copy is captured synchronously before the asynchronous WebCrypto.
 const payload=JSON.parse(JSON.stringify({
  version:1,kind:'native-sea',sourceSha256,session,sea
 }));
 validateNativeSeaCheckpoint(payload,{
  sourceSha256,sourceSlots,worldAssets,portCatalog
 });
 const body=JSON.stringify(payload);
 if(body.length>MAX-100)throw new Error('native sea checkpoint size limit');
 const envelope=JSON.stringify({checksum:await sha(body),payload});
 if(envelope.length>MAX)throw new Error('native sea checkpoint size limit');
 storage.setItem(NATIVE_SEA_CHECKPOINT_KEY,envelope);
 return {stored:true,bytes:envelope.length,index:session.index,
  fidelity:'BROWSER_NATIVE_SEA_ONLY__DOS_SAVE_UNTESTED'};
}
export async function loadNativeSeaCheckpoint({storage,sourceSha256,sourceSlots,
 worldAssets,portCatalog,portCatalogForSlot}){
 if(!storage||typeof storage.getItem!=='function')
  throw new Error('native sea checkpoint storage unavailable');
 const raw=storage.getItem(NATIVE_SEA_CHECKPOINT_KEY);
 if(raw==null)return null;
 if(typeof raw!=='string'||!raw.length||raw.length>MAX)
  throw new Error('native sea checkpoint data size invalid');
 let record;
 try{record=JSON.parse(raw);}
 catch{throw new Error('native sea checkpoint JSON corrupted');}
 if(!record||!/^[a-f0-9]{64}$/.test(record.checksum??''))
  throw new Error('native sea checkpoint checksum marker invalid');
 const body=JSON.stringify(record.payload);
 if(typeof body!=='string'||await sha(body)!==record.checksum)
  throw new Error('native sea checkpoint checksum mismatch');
 const catalog=typeof portCatalogForSlot==='function'
  ? portCatalogForSlot(record.payload?.session?.index)
  : portCatalog;
 return {...validateNativeSeaCheckpoint(record.payload,{
  sourceSha256,sourceSlots,worldAssets,portCatalog:catalog
 }),portCatalog:catalog};
}
export function restoreNativeSeaRuntime({sea,session,worldAssets,windCur}){
 // Validate before constructing new runtime. No actual game is mutated.
 if(!sea||!session||!validNativeSeaMotion(sea,worldAssets)||
    !int(sea.heading,0,7)||!int(sea.steps,0,1000000000)||
    !int(sea.ticks,0,1000000000)||
    !timeValid(sea.dateTime)||sea.month!==sea.dateTime.month)
  throw new Error('native sea runtime checkpoint source invalid');
 const runtime=new SeaRuntime(worldAssets,{x:sea.x,y:sea.y},
  windCur,sea.month,session.fleet,sea.dateTime);
 runtime.heading=sea.heading;runtime.steps=sea.steps;runtime.ticks=sea.ticks;
 runtime.accX=sea.accX;runtime.accY=sea.accY;
 runtime.lastEvent='browser-sea-checkpoint-resume';
 return runtime;
}
