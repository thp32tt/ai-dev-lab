// Explicit, opt-in browser keyboard binding for a staged original DOS child
// executing in the *same* 8086/RAM/IVT as its suspended parent.
// No auto-run loop, global DOM listener, fake keystroke or DOS status.
import {RealMode8086} from './realmode-8086.js';
import {createBiosKeyboardQueue} from './bios-keyboard-queue.js';
import {attachBrowserBiosKeyboard} from './browser-bios-keyboard.js';
import {createStagedDosChildContinuation} from './dos-child-continuation.js';

export function createBrowserDosChildBridge({
  cpu,target,initialFrame,maxQueuedKeys=64,maxTotalSteps=1000000,
  onBeforeInstruction
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('original browser child requires staged RealMode8086');
  if(!target||typeof target.addEventListener!=='function'||
     typeof target.removeEventListener!=='function')
    throw new TypeError('original browser child requires explicit event target');
  const queue=createBiosKeyboardQueue({maxQueuedKeys});
  const binding=attachBrowserBiosKeyboard({target,keyboardQueue:queue});
  let child;
  try{
    child=createStagedDosChildContinuation(cpu,{
      initialFrame,keyboardQueue:queue,maxTotalSteps,onBeforeInstruction
    });
  }catch(error){
    // Failed child ownership must never leave a browser key listener behind.
    binding.detach();
    throw error;
  }
  let detached=false;
  const snapshot=()=>Object.freeze({
    child:child.snapshot(),
    keyboard:binding.snapshot(),
    queue:queue.snapshot(),detached,
    fidelity:'EXPLICIT_BROWSER_KEYS_TO_STAGED_ORIGINAL_DOS_CHILD__DOS_REFERENCE_UNTESTED'
  });
  const detach=()=>{
    if(!detached){binding.detach();detached=true;}
  };
  const runSlice=maxSteps=>{
    try{
      const result=child.runSlice(maxSteps);
      // Once a native DOS child has finished, no parent input may be
      // intercepted by the former child keyboard owner.
      if(result.state!=='ACTIVE')detach();
      return result;
    }catch(error){
      if(child.snapshot().state!=='ACTIVE')detach();
      throw error;
    }
  };
  const abort=()=>{
    const result=child.abort();
    detach();
    return result;
  };
  return Object.freeze({runSlice,abort,detach,snapshot});
}
