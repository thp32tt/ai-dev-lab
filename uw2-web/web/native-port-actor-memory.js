// Browser-only memory of SOURCE-VERIFIED local NPCs across native ports.
// Distinct original catalog IDs 100..129 share mapId 100; NEVER use the
// PORTMAP bank index as an actor owner. This is NOT a guessed DOS save format.
const uint=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const evidence='SOURCE_KOUKAI2_TOWN_ACTORS_CARRIED_IN_BROWSER';
function validActors(actors){
 if(!Array.isArray(actors)||actors.length>8)return false;
 const slots=new Set();
 for(const a of actors){
  if(!a||!uint(a.slot,7)||slots.has(a.slot)||!uint(a.x,255)||
     !uint(a.y,255)||!uint(a.type,255)||typeof a.active!=='boolean'||
     (a.active&&(a.x===255||a.y===255)))return false;
  slots.add(a.slot);
 }
 return true;
}
export function validNativePortActorMemory(memory){
 if(memory===undefined)return true;
 if(!memory||typeof memory!=='object'||Array.isArray(memory))return false;
 const keys=Object.keys(memory);
 if(keys.length>130)return false;
 return keys.every(key=>{
  const id=Number(key),record=memory[key];
  return uint(id,129)&&String(id)===key&&record&&
    typeof record==='object'&&!Array.isArray(record)&&
    record.source===evidence&&validActors(record.actors);
 });
}
function originalCatalogId(previous){
 const id=previous?.portCatalogId;
 if(uint(id,129))return id;
 // Only ordinary source ports 0..99 uniquely map mapId -> catalog id.
 if(uint(previous?.port,99))return previous.port;
 return null;
}
function knownCurrentActors(previous){
 if(!validActors(previous?.townActors))return false;
 const tag=previous?.arrivalEvidence?.actorStatus;
 return tag==null||tag==='CURRENT_PORT_SOURCE_ACTORS'||
   tag==='KNOWN_PORT_BROWSER_ACTORS';
}
export function prepareNativePortActorContinuity(previous,target){
 if(!previous||!uint(target?.id,129)||
    !validNativePortActorMemory(previous.portActorMemory)||
    !validActors(previous.townActors))
  throw new Error('native port actor source/memory invalid');
 const from=originalCatalogId(previous);
 const memory=structuredClone(previous.portActorMemory??{});
 const owns=from!==null&&knownCurrentActors(previous);
 // Store known people at their TRUE original port, even when the next
 // destination is a different city. Unknown towns are not populated.
 if(owns)memory[String(from)]={
   source:evidence,actors:structuredClone(previous.townActors)
 };
 const record=memory[String(target.id)];
 const known=!!record;
 return {
  portActorMemory:memory,
  townActors:known?structuredClone(record.actors):[],
  actorStatus:known
    ?(owns&&from===target.id
       ?'CURRENT_PORT_SOURCE_ACTORS':'KNOWN_PORT_BROWSER_ACTORS')
    :'OTHER_PORT_ACTORS_NOT_VERIFIED'
 };
}
