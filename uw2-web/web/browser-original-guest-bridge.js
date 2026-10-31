// Explicitly attached browser event source for a staged guest 8086 program.
// No global DOM listener, autoplay, synthetic KeyboardEvent, game rendering,
// or inferred DOS timing. The caller explicitly runs each CPU instruction slice.
import {RealMode8086} from './realmode-8086.js';
import {createBiosKeyboardQueue} from './bios-keyboard-queue.js';
import {attachBrowserBiosKeyboard} from './browser-bios-keyboard.js';
import {createGuestOriginalExecutionSession} from './guest-original-execution-session.js';
import {supplyPinnedGuestDosIvtVector} from './guest-dos-ivt-await.js';

export function createBrowserOriginalGuestBridge({
  cpu,target,maxQueuedKeys=64,maxTotalSteps=1000000,
  pauseOnMissingDosIvt=false,pauseOnMissingGuestInterrupt=false
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('original browser guest bridge requires staged RealMode8086');
  if(!target||typeof target.addEventListener!=='function'||
     typeof target.removeEventListener!=='function')
    throw new TypeError('original browser guest bridge requires explicit event target');
  const queue=createBiosKeyboardQueue({maxQueuedKeys});
  const binding=attachBrowserBiosKeyboard({target,keyboardQueue:queue});
  let session;
  try{
    // A pre-existing INT16 owner is an error. Never displace it, and remove
    // our browser listener on failed assembly rather than leave a key sink.
    session=createGuestOriginalExecutionSession(cpu,{
      keyboardQueue:queue,maxTotalSteps,
      pauseOnMissingDosIvt,pauseOnMissingGuestInterrupt
    });
  }catch(error){
    binding.detach();
    throw error;
  }
  let detached=false,provisioning=false;
  const detach=()=>{
    if(provisioning)throw new Error('cannot detach while DOS IVT SHA verification is pending');
    if(!detached){
      session.releaseKeyboardAdapter();
      binding.detach();detached=true;
    }
  };
  const runSlice=steps=>{
    if(provisioning)
      throw new Error('original browser guest cannot run while DOS IVT is being verified');
    try{
      const result=session.runSlice(steps);
      if(result.reason==='TERMINATED')detach();
      return result;
    }catch(error){
      if(session.snapshot().faulted)detach();
      throw error;
    }
  };
  const supplyPinnedDosIvtVector=async ({number,bytes,expectedSha256}={})=>{
    if(detached||session.snapshot().faulted||session.snapshot().terminated)
      throw new Error('detached/faulted original browser guest cannot accept IVT');
    if(provisioning)throw new Error('concurrent browser original IVT supply: fail closed');
    const waiting=session.snapshot().waiting;
    if(waiting?.reason!=='WAIT_EXTERNAL_DOS_IVT_VECTOR'||
       waiting.missingInterruptVector!==number)
      throw new Error('browser original DOS vector must match active source wait');
    provisioning=true;
    try{
      const result=await supplyPinnedGuestDosIvtVector(cpu,{
        number,bytes,expectedSha256
      });
      session.acknowledgeResolvedWait();
      return result;
    }finally{provisioning=false;}
  };
  return Object.freeze({
    runSlice,detach,supplyPinnedDosIvtVector,
    snapshot:()=>Object.freeze({
      execution:session.snapshot(),
      keyboard:binding.snapshot(),
      queue:queue.snapshot(),
      detached,provisioning,
      fidelity:'EXPLICIT_TRUSTED_BROWSER_KEYS_TO_STAGED_GUEST_CPU_ONLY__ORIGINAL_DOS_UNTESTED'
    })
  });
}
