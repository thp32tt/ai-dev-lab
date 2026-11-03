// Explicitly attached browser event source for a staged guest 8086 program.
// No global DOM listener, autoplay, synthetic KeyboardEvent, game rendering,
// or inferred DOS timing. The caller explicitly runs each CPU instruction slice.
import {RealMode8086} from './realmode-8086.js';
import {createBiosKeyboardQueue} from './bios-keyboard-queue.js';
import {attachBrowserBiosKeyboard} from './browser-bios-keyboard.js';
import {createGuestOriginalExecutionSession} from './guest-original-execution-session.js';
import {supplyPinnedGuestDosIvtVector} from './guest-dos-ivt-await.js';
import {installManagedEmsOriginalServices} from './ems-int67-manager.js';

export function createBrowserOriginalGuestBridge({
  cpu,target,maxQueuedKeys=64,maxTotalSteps=1000000,
  pauseOnMissingDosIvt=false,pauseOnMissingGuestInterrupt=false,
  ems
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('original browser guest bridge requires staged RealMode8086');
  if(!target||typeof target.addEventListener!=='function'||
     typeof target.removeEventListener!=='function')
    throw new TypeError('original browser guest bridge requires explicit event target');
  // The caller has already staged the guest and explicitly reserved an
  // empty 64-KiB EMS frame; never infer a manager from free-looking RAM.
  // Bind before a DOM listener, and relinquish exact ownership if any
  // later keyboard/session setup fails.
  let emsBinding=null,binding=null,session;
  try{
    if(ems!==undefined)
      emsBinding=installManagedEmsOriginalServices(cpu,ems);
    const queue=createBiosKeyboardQueue({maxQueuedKeys});
    binding=attachBrowserBiosKeyboard({target,keyboardQueue:queue});
    session=createGuestOriginalExecutionSession(cpu,{
      keyboardQueue:queue,maxTotalSteps,
      pauseOnMissingDosIvt,pauseOnMissingGuestInterrupt
    });
    // Queue remains local to this session, never shared with another CPU.
    return createOwnedBridge({cpu,binding,session,queue,emsBinding});
  }catch(error){
    binding?.detach();
    emsBinding?.close();
    throw error;
  }
}
// The owned EMS 67h device and the BIOS 16h/DOM keyboard bindings share
// exactly the same terminal/fault/manual-release lifetime.
function createOwnedBridge({cpu,binding,session,queue,emsBinding}){
  let detached=false,provisioning=false;
  const detach=()=>{
    if(provisioning)throw new Error('cannot detach while DOS IVT SHA verification is pending');
    if(!detached){
      session.releaseKeyboardAdapter();
      binding.detach();
      emsBinding?.close();
      detached=true;
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
      ems:emsBinding&&!detached?emsBinding.snapshot():null,
      emsExplicitlyProvisioned:!!emsBinding,
      detached,provisioning,
      fidelity:'EXPLICIT_TRUSTED_BROWSER_KEYS_TO_STAGED_GUEST_CPU_ONLY__ORIGINAL_DOS_UNTESTED'
    })
  });
}
