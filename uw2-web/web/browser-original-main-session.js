// Original Korean MAIN.EXE SHA-pinned 8086 staging for a caller-owned
// browser guest, with optional explicitly provisioned EMS. This DOES NOT
// synthesize DOS boot PSP/IVT, hardware, campaign state or input events.
import {RealMode8086} from './realmode-8086.js';
import {loadVerifiedMz} from './mz-loader.js';
import {loadPinnedDosPsp} from './dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from './dos-ivt-snapshot.js';
import {createBrowserOriginalGuestBridge} from './browser-original-guest-bridge.js';

export const KOREAN_ORIGINAL_MAIN_SHA256=
 '1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747';
const shaHex=bytes=>Array.from(bytes,
 b=>b.toString(16).padStart(2,'0')).join('');

export async function createBrowserOriginalMainSession({
 cpu,original,target,allocationParagraphs,
 pspSegment=0x1ff0,loadSegment=0x2000,initialPsp,initialIvt,
 ems,maxTotalSteps=1000000,maxQueuedKeys=64,
 pauseOnMissingDosIvt=false,pauseOnMissingGuestInterrupt=false
}={}){
 if(!(cpu instanceof RealMode8086))
  throw new TypeError('browser MAIN requires caller-owned RealMode8086');
 if(!(original instanceof Uint8Array))
  throw new TypeError('browser MAIN requires owner-supplied original EXE');
 if(!target||typeof target.addEventListener!=='function'||
    typeof target.removeEventListener!=='function')
  throw new TypeError('browser MAIN requires explicit keyboard target');
 if(!Number.isSafeInteger(allocationParagraphs)||
    allocationParagraphs<1||allocationParagraphs>65535)
  throw new RangeError('browser MAIN requires bounded original MZ allocation');
 if(!initialPsp||!(initialPsp.bytes instanceof Uint8Array)||
    typeof initialPsp.expectedSha256!=='string')
  throw new TypeError('browser MAIN requires source-pinned external DOS PSP');
 if(!initialIvt||!(initialIvt.bytes instanceof Uint8Array)||
    typeof initialIvt.expectedSha256!=='string'||
    !Array.isArray(initialIvt.knownVectors))
  throw new TypeError('browser MAIN requires source-pinned external DOS IVT');
 if(!globalThis.crypto?.subtle?.digest)
  throw new Error('SHA-256 unavailable for browser MAIN: fail closed');
 // The IVT owner must be known before staging mutates CPU memory, and no
 // external source may silently replace a previously installed EMS/BIOS.
 if(initialIvt.knownVectors.includes(0x16)||
    cpu.interruptVectors.has(0x16)||cpu.interruptAdapters.has(0x16))
  throw new Error('browser MAIN INT16 owner conflict');
 if(ems!==undefined&&(initialIvt.knownVectors.includes(0x67)||
    cpu.interruptVectors.has(0x67)||cpu.interruptAdapters.has(0x67)))
  throw new Error('browser MAIN INT67 EMS owner conflict');
 // Hash and MZ relocation must consume precisely one stable input copy.
 const source=Uint8Array.from(original);
 const digest=shaHex(new Uint8Array(
  await globalThis.crypto.subtle.digest('SHA-256',source)));
 if(digest!==KOREAN_ORIGINAL_MAIN_SHA256)
  throw new Error('original Korean MAIN.EXE fingerprint mismatch: fail closed');
 // These snapshots MUST be caller-supplied genuine external DOS captures.
 // SHA-matching snapshots alone cannot prove their real-world origin.
 // If a stage fails, discard the caller-owned CPU; no retry guarantee.
 const psp=await loadPinnedDosPsp(cpu,initialPsp.bytes,{
  pspSegment,expectedSha256:initialPsp.expectedSha256
 });
 const image=await loadVerifiedMz(cpu,source,{
  pspSegment,loadSegment,allocationParagraphs,
  expectedSha256:KOREAN_ORIGINAL_MAIN_SHA256
 });
 const ivt=await installPinnedDosIvtSnapshot(cpu,initialIvt.bytes,{
  expectedSha256:initialIvt.expectedSha256,knownVectors:initialIvt.knownVectors
 });
 const bridge=createBrowserOriginalGuestBridge({
  cpu,target,maxQueuedKeys,maxTotalSteps,
  pauseOnMissingDosIvt,pauseOnMissingGuestInterrupt,ems
 });
 const status=()=>bridge.snapshot();
 return Object.freeze({
  image,initialPsp:psp,initialIvt:ivt,
  runSlice:steps=>bridge.runSlice(steps),
  detach:()=>bridge.detach(),
  supplyPinnedDosIvtVector:entry=>bridge.supplyPinnedDosIvtVector(entry),
  snapshot:()=>Object.freeze({
   ...status(),originalExeSha256:KOREAN_ORIGINAL_MAIN_SHA256,
   fidelity:'EXACT_KOREAN_MAIN_WITH_EXTERNAL_DOS_SNAPSHOTS__DOS_REFERENCE_AND_CAMPAIGN_UNTESTED'
  })
 });
}
