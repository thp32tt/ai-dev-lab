// An opt-in synchronous execution gate for BIOS INT16 AH00. It does not
// run the CPU over an empty blocking read or invent elapsed DOS time.
import {RealMode8086} from './realmode-8086.js';

export function runGuestUntilKeyboardWait(cpu,{keyboardQueue,maxSteps=256}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('guest keyboard step boundary requires RealMode8086');
  if(!keyboardQueue||typeof keyboardQueue.checkKey!=='function')
    throw new TypeError('guest keyboard step boundary requires keyboard FIFO');
  if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>100000)
    throw new RangeError('guest keyboard step budget must be 1..100000');
  if(cpu.terminated)
    return Object.freeze({steps:0,reason:'TERMINATED',cs:cpu.get16('CS'),ip:cpu.get16('IP')});
  let steps=0,reason='STEP_BUDGET_EXHAUSTED';
  while(steps<maxSteps&&!cpu.terminated){
    const cs=cpu.get16('CS'),ip=cpu.get16('IP');
    // Segment override prefixes may precede INT. REP is not valid for INT
    // in this core and must fail in the CPU instead of being swallowed.
    let pos=ip,prefixes=0;
    let opcode=cpu.read8(cs,pos);
    while([0x26,0x2e,0x36,0x3e].includes(opcode)&&prefixes<8){
      pos=(pos+1)&0xffff;
      opcode=cpu.read8(cs,pos);prefixes++;
    }
    if(opcode===0xcd&&cpu.read8(cs,(pos+1)&0xffff)===0x16&&
       cpu.get8('AH')===0){
      const state=keyboardQueue.checkKey();
      if(!state||typeof state!=='object'||typeof state.available!=='boolean')
        throw new Error('guest keyboard FIFO returned invalid availability: fail closed');
      if(!state.available){reason='WAIT_BIOS_INT16_AH00';break;}
    }
    cpu.step();steps++;
  }
  if(cpu.terminated)reason='TERMINATED';
  return Object.freeze({steps,reason,cs:cpu.get16('CS'),ip:cpu.get16('IP'),
    fidelity:'GUEST_EXECUTION_BOUNDARY_ONLY__NO_HOST_CLOCK_OR_DOS_KEY_TIMING'});
}
