import {canStandAt} from './town.js';
import {validateNativeCheckpointSessionEconomy,validNativeCheckpointClock} from './native-checkpoint-integrity.js';

// NOT the original DOS "Save Data" command. A browser-only checkpoint of an
// idle town session. It is scoped to a SHA-verified Korean KOUKAI2.DAT source
// and requires matching real PORTMAP/PORTCHIP collision data for restoration.
export const NATIVE_TOWN_CHECKPOINT_KEY='uw2-web-native-town-checkpoint-v1';
export const NATIVE_TOWN_CHECKPOINT_VERSION=1;
const MAX_CHECKPOINT_BYTES=256*1024;
const number=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const hash=async text=>{
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
};
const normalizedClone=value=>{
 const text=JSON.stringify(value);
 if(typeof text!=='string'||text.length>MAX_CHECKPOINT_BYTES)
  throw new Error('browser checkpoint exceeds verified session size limit');
 return JSON.parse(text);
};
function validateIdleTown(payload,{sourceSha256,sourceSlots,portAssets,portCatalog}){
 if(!payload||payload.version!==NATIVE_TOWN_CHECKPOINT_VERSION||
    payload.sourceSha256!==sourceSha256||
    !/^[a-f0-9]{64}$/.test(sourceSha256??'')||
    !Array.isArray(sourceSlots)||!Array.isArray(portCatalog))
  throw new Error('browser checkpoint original source fingerprint/version mismatch');
 const {session,town}=payload;
 const original=sourceSlots[session?.index];
 if(!original||original.empty||!session||
    !number(session.index,0,9)||
    session.index!==original.index||
    session.heroId!==original.heroId||
    session.heroName!==original.heroName||
    session.memo!==original.memo||
    JSON.stringify(session.raw)!==JSON.stringify(original.raw))
  throw new Error('browser checkpoint original save slot identity mismatch');
 if(!number(session.port,0,100))
  throw new Error('browser checkpoint source player economy/fleet invalid');
 validateNativeCheckpointSessionEconomy(session,original);
 if(!validNativeCheckpointClock(session.dateTime))
  throw new Error('browser checkpoint original game clock invalid');
 const catalogId=session.portCatalogId??session.port;
 const port=portCatalog.find(x=>x.id===catalogId);
 if(!port||port.mapId!==session.port||
    session.portName!==port.name||!session.portWorld||
    session.portWorld.x!==port.x||session.portWorld.y!==port.y||
    session.portWorld.nation!==port.nation)
  throw new Error('browser checkpoint source port ownership invalid');
 const p=session.portState;
 if(!p||!town||town.portId!==session.port||
    town.portName!==session.portName||
    !number(p.viewX,0,72)||!number(p.viewY,0,72)||
    !number(p.playerX,0,22)||!number(p.playerY,0,22)||
    !number(p.mapX,0,94)||!number(p.mapY,0,94)||
    p.mapX!==p.viewX+p.playerX||p.mapY!==p.viewY+p.playerY||
    !['up','right','down','left'].includes(town.facing)||
    !number(town.stepParity,0,1)||!number(town.talkCounter,0,10)||
    town.building!==null||town.talk!==null||town.dialogueActor!=null||
    !canStandAt(portAssets,session.port,p.mapX,p.mapY))
  throw new Error('browser checkpoint town position/idle state invalid');
 for(const key of ['viewX','viewY','playerX','playerY','mapX','mapY'])
  if(town[key]!==p[key])
   throw new Error('browser checkpoint displayed town position mismatch');
 if(!Array.isArray(session.townActors)||!Array.isArray(town.actors)||
    town.actors.length!==session.townActors.length||
    town.actors.length>8)
  throw new Error('browser checkpoint town actors source invalid');
 const validActor=a=>a&&number(a.slot,0,7)&&number(a.x,0,255)&&
  number(a.y,0,255)&&number(a.type,0,255)&&typeof a.active==='boolean'&&
  (!a.active||(a.x!==255&&a.y!==255));
 if(!town.actors.every(validActor)||!session.townActors.every(validActor)||
    JSON.stringify(town.actors)!==JSON.stringify(session.townActors))
  throw new Error('browser checkpoint native town actor state mismatch');
 return {session,town};
}
export function validateNativeTownCheckpoint(payload,dependencies){
 const value=validateIdleTown(payload,dependencies);
 return structuredClone(value);
}
export async function saveNativeTownCheckpoint({storage,sourceSha256,sourceSlots,
 portAssets,portCatalog,session,town}){
 if(!storage||typeof storage.setItem!=='function')
  throw new Error('browser checkpoint storage unavailable');
 // Snapshot all mutable game data synchronously BEFORE async SHA work.
 const payload=normalizedClone({
  version:1,sourceSha256,session,town
 });
 validateIdleTown(payload,{sourceSha256,sourceSlots,portAssets,portCatalog});
 const body=JSON.stringify(payload);
 const checksum=await hash(body);
 const envelope=JSON.stringify({checksum,payload});
 if(envelope.length>MAX_CHECKPOINT_BYTES)
  throw new Error('browser checkpoint exceeds size limit');
 storage.setItem(NATIVE_TOWN_CHECKPOINT_KEY,envelope);
 return {stored:true,index:payload.session.index,port:payload.session.port,
  bytes:envelope.length,fidelity:'BROWSER_ONLY_TOWN_CHECKPOINT__NOT_DOS_SAVE'};
}
export async function loadNativeTownCheckpoint({storage,sourceSha256,sourceSlots,
 portAssets,portCatalog,portCatalogForSlot}){
 if(!storage||typeof storage.getItem!=='function')
  throw new Error('browser checkpoint storage unavailable');
 const bytes=storage.getItem(NATIVE_TOWN_CHECKPOINT_KEY);
 if(bytes==null)return null;
 if(typeof bytes!=='string'||!bytes.length||bytes.length>MAX_CHECKPOINT_BYTES)
  throw new Error('browser checkpoint size/encoding invalid');
 let envelope;
 try{envelope=JSON.parse(bytes);}
 catch{throw new Error('browser checkpoint JSON corrupted');}
 if(!envelope||typeof envelope.checksum!=='string'||
    !/^[0-9a-f]{64}$/.test(envelope.checksum))
  throw new Error('browser checkpoint SHA marker invalid');
 const body=JSON.stringify(envelope.payload);
 if(typeof body!=='string'||await hash(body)!==envelope.checksum)
  throw new Error('browser checkpoint integrity mismatch');
 // The source PORT table is save-page-specific. A checkpoint for slot 2
 // must never restore using the current screen's slot 1 port directory.
 const sourceSlotIndex=envelope.payload?.session?.index;
 const resolvedCatalog=typeof portCatalogForSlot==='function'
  ? portCatalogForSlot(sourceSlotIndex)
  : portCatalog;
 const restored=validateNativeTownCheckpoint(envelope.payload,{
  sourceSha256,sourceSlots,portAssets,portCatalog:resolvedCatalog
 });
 return {...restored,portCatalog:resolvedCatalog};
}
export function resumeNativeTownRuntime(runtime,town){
 if(!runtime||!town||runtime.portId!==town.portId||
    runtime.mapX!==town.mapX||runtime.mapY!==town.mapY||
    !['up','right','down','left'].includes(town.facing)||
    !number(town.stepParity,0,1)||!number(town.talkCounter,0,10))
  throw new Error('browser checkpoint runtime/position mismatch');
 runtime.facing=town.facing;
 runtime.stepParity=town.stepParity;
 runtime.talkCounter=town.talkCounter;
 runtime.lastEvent='browser-checkpoint-resume';
 return runtime;
}
