// One queued externally sourced hardware edge at an owned CPU boundary.
// This is not an oscillator, tick scheduler, PIC, or proof of PIT timing.
// No guest CPU instruction executes as a side effect of enqueue().
import {RealMode8086} from './realmode-8086.js';
import {deliverExternalMaskableIrq} from './guest-irq-boundary.js';
import {isOriginalMasterPicCommandWitness} from './guest-pic8259-command-witness.js';

export function createExternalGuestIrqEdgeQueue(cpu,{
  maxPending=128,picCommandWitness
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('original IRQ edge queue requires shared RealMode8086');
  if(!Number.isSafeInteger(maxPending)||maxPending<1||maxPending>1024)
    throw new RangeError('original IRQ edge queue cap must be 1..1024');
  if(picCommandWitness!==undefined&&
     (!isOriginalMasterPicCommandWitness(picCommandWitness)||
      !picCommandWitness.ownsIrq0Cpu(cpu)))
    throw new Error('external IRQ0 PIC gate needs exact original CPU witness');
  // A service bit cannot be released if OUT 20h reaches another provider.
  // Require the *exact* witnessed I/O handler before admitting any IRQ0.
  if(picCommandWitness!==undefined&&
     cpu.portHandlers.get(0x20)!==picCommandWitness.port20)
    throw new Error('PIC IRQ0 gate requires exact guest port 20h handler');
  const pending=[];
  let accepted=0,delivered=0,masked=0,deferred=0,picDeferred=0,discarded=0;
  const snapshot=()=>Object.freeze({
    pending:pending.length,accepted,delivered,masked,deferred,picDeferred,discarded,
    maxPending,picIrq0GateEnabled:picCommandWitness!==undefined,
    fidelity:picCommandWitness!==undefined?
      'EXPLICIT_IRQ0_EDGE_WITH_GUEST_EOI_GATE__PIT_PIC_TIMING_UNTESTED':
      'EXPLICIT_HOST_IRQ_EDGE_ONLY__PIT_PIC_CLOCK_TIMING_UNTESTED'
  });
  const enqueue=({vector,source}={})=>{
    if(!Number.isInteger(vector)||vector<0||vector>255)
      throw new RangeError('external guest IRQ edge vector must be uint8');
    if(typeof source!=='string'||!source.trim()||source.length>128)
      throw new TypeError('external guest IRQ edge needs explicit device source');
    if(cpu.terminated)throw new Error('terminated guest cannot queue hardware IRQ');
    if(!cpu.interruptVectors.has(vector))
      throw new Error('hardware IRQ edge needs verified guest IVT vector: fail closed');
    if(picCommandWitness!==undefined&&vector!==8)
      throw new Error('opted-in PIC IRQ0 gate refuses other interrupt lines');
    if(pending.length>=maxPending)
      throw new Error('hardware IRQ edge queue overflow: fail closed');
    pending.push(Object.freeze({vector,source}));accepted++;
    return snapshot();
  };
  const deliverOne=()=>{
    if(!pending.length)return null;
    const edge=pending[0];
    if(picCommandWitness!==undefined&&
       !picCommandWitness.canAdmitIrq0(cpu,edge)){
      picDeferred++;
      return Object.freeze({delivered:false,...edge,
        reason:'DEFERRED_PIC_IRQ0_IN_SERVICE'});
    }
    const result=deliverExternalMaskableIrq(cpu,edge);
    if(result.delivered){
      picCommandWitness?.confirmDeliveredIrq0(cpu,edge);
      pending.shift();delivered++;
    }
    else if(result.reason==='MASKED_IF_CLEAR')masked++;
    else if(result.reason==='DEFERRED_AFTER_STI_OR_SS')deferred++;
    else throw new Error('unknown external IRQ delivery decision: fail closed');
    return Object.freeze({...result});
  };
  // An aborted or completed DOS child never transfers its unaccepted edges
  // to an unrelated parent or the next child process.
  const clear=()=>{
    discarded+=pending.length;
    pending.length=0;
    return snapshot();
  };
  return Object.freeze({enqueue,deliverOne,snapshot,clear});
}
