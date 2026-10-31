// Explicit opt-in, resumable execution of already staged authentic guest bytes.
// Owns BIOS INT16 queue adapter, not any browser event or synthetic DOS clock.
// A session never reloads guest code after a real keyboard wait.
import {RealMode8086} from './realmode-8086.js';
import {installBiosInt16} from './bios-int16.js';
import {runGuestUntilKeyboardWait} from './guest-bios-keyboard-step.js';

export function createGuestOriginalExecutionSession(cpu,{
  keyboardQueue,maxTotalSteps=1000000,onBeforeInstruction
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('original execution session requires RealMode8086');
  if(!keyboardQueue||typeof keyboardQueue.checkKey!=='function'||
     typeof keyboardQueue.readKey!=='function')
    throw new TypeError('original execution session requires a shared external BIOS FIFO');
  if(!Number.isSafeInteger(maxTotalSteps)||maxTotalSteps<1||maxTotalSteps>15000000)
    throw new RangeError('original execution total step budget must be 1..15000000');
  if(onBeforeInstruction!==undefined&&typeof onBeforeInstruction!=='function')
    throw new TypeError('original execution observer must be synchronous');
  // Fail on an existing BIOS vector/adapter, never silently override a
  // device already installed by another original DOS execution owner.
  installBiosInt16(cpu,{keyboardQueue});
  let executed=0,slices=0,lastReason=null,running=false,faulted=false;
  const status=()=>Object.freeze({
    totalExecutedSteps:executed,remainingSteps:maxTotalSteps-executed,
    slices,lastReason,terminated:!!cpu.terminated,faulted,
    cs:cpu.get16('CS'),ip:cpu.get16('IP'),
    fidelity:'ORIGINAL_GUEST_STEPS_ONLY__NO_HOST_CLOCK_OR_SYNTHETIC_KEY_EVENTS'
  });
  const runSlice=(maxSteps=256)=>{
    if(!Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>100000)
      throw new RangeError('original execution slice must be 1..100000 steps');
    if(running)throw new Error('reentrant original guest execution is forbidden');
    // An I/O, BIOS, DOS, IRQ or unsupported-opcode fault may already have
    // advanced IP or partially committed guest/device state. This is never
    // a resumable key wait and must not silently skip the failed instruction.
    if(faulted)throw new Error('faulted original guest execution session cannot resume: fail closed');
    running=true;
    let steps=0,reason='SLICE_STEP_BUDGET_EXHAUSTED';
    try{
      if(cpu.terminated)reason='TERMINATED';
      else if(executed>=maxTotalSteps)reason='TOTAL_STEP_BUDGET_EXHAUSTED';
      else{
        while(steps<maxSteps&&executed<maxTotalSteps&&!cpu.terminated){
          // Exactly one genuine CPU instruction per owned boundary.
          // A blocked AH00 must leave the guest CS:IP and FIFO untouched.
          const result=runGuestUntilKeyboardWait(cpu,{keyboardQueue,maxSteps:1,
            onBeforeInstruction});
          if(result.reason==='WAIT_BIOS_INT16_AH00'){
            reason=result.reason;break;
          }
          if(result.steps!==1)
            throw new Error('original CPU step did not complete or block: fail closed');
          steps++;executed++;
        }
        if(cpu.terminated)reason='TERMINATED';
        else if(executed>=maxTotalSteps)reason='TOTAL_STEP_BUDGET_EXHAUSTED';
      }
      lastReason=reason;slices++;
      return Object.freeze({steps,reason,...status()});
    }catch(error){
      faulted=true;lastReason='FAULTED';
      if(error instanceof Error){
        error.guestCS=cpu.get16('CS');
        error.guestIP=cpu.get16('IP');
        error.completedSessionSteps=executed;
      }
      throw error;
    }finally{running=false;}
  };
  return Object.freeze({runSlice,snapshot:status});
}
