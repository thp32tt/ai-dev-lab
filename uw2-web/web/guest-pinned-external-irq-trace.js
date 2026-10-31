// SHA-pinned caller-supplied IRQ edge observations at exact *guest instruction
// ordinals*. This is NOT a PC PIT clock/PIC/IRQ capture or DOS-reference
// authenticity proof. It contains no original copyrighted executable bytes.
// Record v1: five bytes = uint32le ordinal + uint8 IVT vector.
const ownedTapes=new WeakSet();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

export async function createPinnedExternalGuestIrqTrace(bytes,{
  expectedSha256,source,maxEvents=4096
}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length%5!==0)
    throw new RangeError('pinned external IRQ trace needs complete 5-byte records');
  if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>65536||
     bytes.length/5>maxEvents)
    throw new RangeError('pinned external IRQ trace needs bounded event count');
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new TypeError('pinned external IRQ trace expected SHA-256 required');
  if(typeof source!=='string'||!source.trim()||source.length>128)
    throw new TypeError('pinned external IRQ trace needs explicit device source');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('pinned external IRQ trace SHA-256 unavailable: fail closed');
  const original=new Uint8Array(bytes); // Never read mutable caller bytes later.
  const digest=hex(new Uint8Array(await globalThis.crypto.subtle.digest(
    'SHA-256',original)));
  if(digest!==expectedSha256)
    throw new Error('pinned external IRQ trace SHA-256 mismatch: fail closed');
  const events=[];let previous=-1;
  for(let i=0;i<original.length;i+=5){
    const step=(original[i]|(original[i+1]<<8)|
      (original[i+2]<<16)|(original[i+3]<<24))>>>0;
    if(step>15000000||step<=previous)
      throw new Error('external IRQ trace ordinals must strictly increase within native budget');
    previous=step;
    events.push(Object.freeze({step,vector:original[i+4],source}));
  }
  let cursor=0,claimed=false;
  const snapshot=()=>Object.freeze({
    sha256:digest,eventCount:events.length,admitted:cursor,
    ownerClaimed:claimed,
    nextStep:cursor<events.length?events[cursor].step:null,
    fidelity:'CALLER_SHA_PINNED_NATIVE_STEP_IRQ_TRACE__NOT_DOS_REFERENCE_OR_TIMING'
  });
  const claimOwner=()=>{
    if(claimed)throw new Error('pinned IRQ trace already owned by another guest execution');
    claimed=true;
  };
  const nextDueStep=()=>events[cursor]?.step??null;
  const admitAt=(completedSteps,enqueue)=>{
    if(!Number.isSafeInteger(completedSteps)||completedSteps<0||
       completedSteps>15000000)
      throw new RangeError('guest IRQ trace needs bounded completed native steps');
    if(typeof enqueue!=='function')
      throw new TypeError('guest IRQ trace requires explicit session enqueue');
    const next=events[cursor];
    if(!next)return null;
    if(completedSteps>next.step)
      throw new Error('original IRQ trace event boundary skipped: fail closed');
    if(completedSteps<next.step)return null;
    // Only a successful bounded guest-queue admission can consume evidence.
    const accepted=enqueue(Object.freeze({vector:next.vector,source:next.source}));
    if(!accepted||typeof accepted!=='object'||
       typeof accepted.pending!=='number')
      throw new Error('original IRQ trace queue admission must be confirmed');
    cursor++;
    return Object.freeze({step:next.step,vector:next.vector,source:next.source});
  };
  const api=Object.freeze({nextDueStep,admitAt,snapshot,claimOwner});
  ownedTapes.add(api);
  return api;
}
export const isPinnedExternalGuestIrqTrace=tape=>ownedTapes.has(tape);
