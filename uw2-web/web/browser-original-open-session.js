// Explicitly provided, SHA-pinned Korean OPEN.EXE browser guest staging.
// This is NOT a DOS boot, game launcher, original PSP/IVT provenance proof,
// or a substitute for DOS, VGA, PIT, OPL and file-service implementations.
import {RealMode8086} from './realmode-8086.js';
import {loadVerifiedMz} from './mz-loader.js';
import {loadPinnedDosPsp} from './dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from './dos-ivt-snapshot.js';
import {createBrowserOriginalGuestBridge} from './browser-original-guest-bridge.js';

export const KOREAN_ORIGINAL_OPEN_SHA256='f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65';
const shaHex=bytes=>Array.from(bytes,
  b=>b.toString(16).padStart(2,'0')).join('');

// This entrypoint never fetches private bytes or registers global listeners.
// Caller-supplied original snapshots must already be separately verified
// against a genuine DOS reference; a matching caller-supplied hash alone does
// not prove their origin or hardware timing.
export async function createBrowserOriginalOpenSession({
  cpu,original,target,allocationParagraphs,pspSegment=0x600,
  loadSegment=0x610,initialPsp,initialIvt,
  maxTotalSteps=1000000,maxQueuedKeys=64,
  pauseOnMissingDosIvt=false,pauseOnMissingGuestInterrupt=false
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('browser original OPEN requires shared RealMode8086');
  if(!(original instanceof Uint8Array))
    throw new TypeError('browser original OPEN requires owner-supplied EXE bytes');
  if(!target||typeof target.addEventListener!=='function'||
     typeof target.removeEventListener!=='function')
    throw new TypeError('browser original OPEN requires explicit keyboard target');
  if(!Number.isSafeInteger(allocationParagraphs)||allocationParagraphs<1||
     allocationParagraphs>65535)
    throw new RangeError('browser original OPEN requires explicit bounded allocation');
  if(!initialPsp||!(initialPsp.bytes instanceof Uint8Array)||
     typeof initialPsp.expectedSha256!=='string')
    throw new TypeError('browser original OPEN requires pinned external DOS PSP');
  if(!initialIvt||!(initialIvt.bytes instanceof Uint8Array)||
     typeof initialIvt.expectedSha256!=='string'||
     !Array.isArray(initialIvt.knownVectors))
    throw new TypeError('browser original OPEN requires pinned external DOS IVT');
  // Fail before importing any unverified original MZ bytes or attaching a
  // keyboard handler. No optional override of the Korean OPEN fingerprint.
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('SHA-256 unavailable for original browser OPEN: fail closed');
  // The double-check and the MZ load must use one pinned original buffer.
  const originalBytes=Uint8Array.from(original);
  const hash=shaHex(new Uint8Array(
    await globalThis.crypto.subtle.digest('SHA-256',originalBytes)));
  if(hash!==KOREAN_ORIGINAL_OPEN_SHA256)
    throw new Error('original Korean OPEN.EXE fingerprint mismatch: fail closed');
  if(cpu.interruptVectors.has(0x16)||cpu.interruptAdapters.has(0x16)||
     initialIvt.knownVectors.includes(0x16))
    throw new Error('original browser keyboard INT16 ownership collision: fail closed');
  // Source loader verifies PSP, MZ and IVT independently. A failed staging
  // attempt may have changed the provided CPU; discard it rather than retry.
  const psp=await loadPinnedDosPsp(cpu,initialPsp.bytes,{
    pspSegment,expectedSha256:initialPsp.expectedSha256
  });
  const image=await loadVerifiedMz(cpu,originalBytes,{
    pspSegment,loadSegment,allocationParagraphs,
    expectedSha256:KOREAN_ORIGINAL_OPEN_SHA256
  });
  const ivt=await installPinnedDosIvtSnapshot(cpu,initialIvt.bytes,{
    expectedSha256:initialIvt.expectedSha256,knownVectors:initialIvt.knownVectors
  });
  const bridge=createBrowserOriginalGuestBridge({
    cpu,target,maxTotalSteps,maxQueuedKeys,
    pauseOnMissingDosIvt,pauseOnMissingGuestInterrupt
  });
  return Object.freeze({
    image,initialPsp:psp,initialIvt:ivt,
    runSlice:steps=>bridge.runSlice(steps),
    supplyPinnedDosIvtVector:entry=>bridge.supplyPinnedDosIvtVector(entry),
    detach:()=>bridge.detach(),
    snapshot:()=>Object.freeze({
      execution:bridge.snapshot().execution,
      keyboard:bridge.snapshot().keyboard,
      queue:bridge.snapshot().queue,
      detached:bridge.snapshot().detached,
      originalExeSha256:KOREAN_ORIGINAL_OPEN_SHA256,
      fidelity:'SHA_PINNED_ORIGINAL_OPEN_BYTES_WITH_CALLER_DOS_SNAPSHOTS__DOS_REFERENCE_UNTESTED'
    })
  });
}
