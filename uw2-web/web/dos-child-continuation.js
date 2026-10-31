// Opt-in, state-retaining staged DOS child slice controller. The original
// 8086 bytes, RAM, DOS adapters, IVT and device state are never duplicated.
// Not a DOS EXEC scheduler: the parent is suspended until child completion
// or explicit abort. In particular it never invents a DOS exit status.
import {RealMode8086} from './realmode-8086.js';
import {DOS_CPU_FRAME_NAMES,captureDosCpuFrame} from './dos-com-child-runner.js';
import {createGuestOriginalExecutionSession} from './guest-original-execution-session.js';
import {createExternalGuestIrqEdgeQueue} from './guest-external-irq-queue.js';
import {isPinnedExternalGuestIrqTrace} from './guest-pinned-external-irq-trace.js';

const validFrame=frame=>{
  if(!frame||typeof frame!=='object'||Array.isArray(frame)||
     Object.keys(frame).length!==DOS_CPU_FRAME_NAMES.length||
     DOS_CPU_FRAME_NAMES.some(name=>!Object.hasOwn(frame,name)))
    throw new TypeError('staged DOS child needs exactly 14 CPU frame registers');
  for(const name of DOS_CPU_FRAME_NAMES)
    if(!Number.isInteger(frame[name])||frame[name]<0||frame[name]>65535)
      throw new RangeError('staged DOS child '+name+' must be uint16');
};
const validStatus=status=>{
  if(!status||!Number.isInteger(status.terminationType)||
     status.terminationType<0||status.terminationType>255||
     !Number.isInteger(status.returnCode)||status.returnCode<0||
     status.returnCode>255)
    throw new Error('staged DOS child terminated without verified DOS process status');
  if(status.terminationType===3&&
     (!Number.isInteger(status.residentParagraphs)||status.residentParagraphs<1))
    throw new Error('staged DOS TSR child missing resident paragraphs: fail closed');
  return Object.freeze({terminationType:status.terminationType,
    returnCode:status.returnCode,
    residentParagraphs:status.terminationType===3?status.residentParagraphs:null});
};

export function createStagedDosChildContinuation(cpu,{
  initialFrame,maxTotalSteps=1000000,keyboardQueue,onBeforeInstruction,
  maxQueuedExternalIrqs=128,externalIrqEvidenceTape
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('staged DOS child requires shared RealMode8086');
  validFrame(initialFrame);
  if(!Number.isSafeInteger(maxTotalSteps)||maxTotalSteps<1||
     maxTotalSteps>15000000)
    throw new RangeError('staged DOS child instruction cap must be 1..15000000');
  if(cpu.terminated)throw new Error('cannot stage child from terminated DOS parent');
  if(keyboardQueue!==undefined&&(cpu.interruptVectors.has(0x16)||
     cpu.interruptAdapters.has(0x16)))
    throw new Error('staged DOS child INT16 adapter ownership collision');
  if(onBeforeInstruction!==undefined&&typeof onBeforeInstruction!=='function')
    throw new TypeError('staged child observer must be synchronous');
  if(!Number.isSafeInteger(maxQueuedExternalIrqs)||maxQueuedExternalIrqs<1||
     maxQueuedExternalIrqs>1024)
    throw new RangeError('staged child external IRQ edge queue cap must be 1..1024');
  if(externalIrqEvidenceTape!==undefined&&
     !isPinnedExternalGuestIrqTrace(externalIrqEvidenceTape))
    throw new TypeError('staged child external IRQ trace must be SHA-pinned');
  const parent=captureDosCpuFrame(cpu),parentTermination=cpu.terminated,
    parentIrqShadow=cpu.maskableIrqShadow;
  let guest=null,running=false;
  const irqEdges=createExternalGuestIrqEdgeQueue(cpu,{
    maxPending:maxQueuedExternalIrqs
  });
  let state='ACTIVE',result=null,steps=0,slices=0,childFrame=null,
    expectedFrame=null,expectedIrq=0,expectedTerminated=null;
  const restoreParent=()=>{
    irqEdges.clear();
    // A child-only BIOS queue belongs to this execution session. It must
    // not outlive the child or intercept the suspended parent's INT16.
    let cleanupError=null;
    try{guest?.releaseKeyboardAdapter();}
    catch(error){cleanupError=error;}
    finally{
      for(const name of DOS_CPU_FRAME_NAMES)cpu.set16(name,parent[name]);
      cpu.terminated=parentTermination;
      cpu.maskableIrqShadow=parentIrqShadow;
    }
    if(cleanupError)throw cleanupError;
  };
  try{
    for(const name of DOS_CPU_FRAME_NAMES)cpu.set16(name,initialFrame[name]);
    cpu.terminated=null;cpu.maskableIrqShadow=0;
    expectedFrame=captureDosCpuFrame(cpu);
    expectedIrq=cpu.maskableIrqShadow;
  }catch(error){restoreParent();throw error;}
  try{
    guest=createGuestOriginalExecutionSession(cpu,{
      maxTotalSteps,keyboardQueue,onBeforeInstruction
    });
  }catch(error){restoreParent();throw error;}
  const snapshot=()=>Object.freeze({state,steps,slices,result,
    childFrame,irqEdges:irqEdges.snapshot(),
    irqEvidence:externalIrqEvidenceTape?.snapshot()??null,
    restored:state!=='ACTIVE',
    fidelity:'STAGED_ORIGINAL_GUEST_CHILD_STEPS__NO_DOS_EXEC_SCHEDULER'});
  const requireOwner=()=>{
    if(state!=='ACTIVE')throw new Error('DOS child session is not active');
    const frame=captureDosCpuFrame(cpu);
    if(DOS_CPU_FRAME_NAMES.some(n=>frame[n]!==expectedFrame[n])||
       cpu.maskableIrqShadow!==expectedIrq||
       cpu.terminated!==expectedTerminated)
      throw new Error('staged DOS child CPU ownership/state changed externally: fail closed');
  };
  const runSlice=(maxSteps=256)=>{
    if(!Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>100000)
      throw new RangeError('staged DOS child slice must be 1..100000');
    if(running)throw new Error('reentrant staged DOS child execution: fail closed');
    requireOwner();running=true;
    try{
      // One explicit external device edge can be admitted before the next
      // guest instruction slice. IF/SS/STI guards keep a masked edge pending.
      // A hardware edge cannot consume guest stack or transfer into its
      // ISR once the owned native-instruction budget has been exhausted.
      // The caller must explicitly abort rather than resume with zero steps.
      if(steps<maxTotalSteps&&externalIrqEvidenceTape)
        externalIrqEvidenceTape.admitAt(steps,edge=>irqEdges.enqueue(edge));
      const irq=steps<maxTotalSteps?irqEdges.deliverOne():null;
      // The trace is indexed by completed *native guest* instructions.
      // Stop exactly at the next pinned boundary instead of skipping its
      // event within a large frame slice. Never infer clock cycles.
      const due=externalIrqEvidenceTape?.nextDueStep()??null;
      if(due!==null&&due<steps)
        throw new Error('original IRQ trace event boundary skipped: fail closed');
      const nextMaxSteps=due!==null&&steps<maxTotalSteps?
        Math.min(maxSteps,due-steps):maxSteps;
      if(nextMaxSteps<1)
        throw new Error('original IRQ trace has an invalid due-now edge');
      const segment=guest.runSlice(nextMaxSteps);
      steps=segment.totalExecutedSteps;slices++;
      childFrame=captureDosCpuFrame(cpu);
      if(segment.reason==='TERMINATED'){
        result=validStatus(cpu.terminated);
        state='COMPLETED';
        restoreParent();
      }else{
        expectedFrame=childFrame;
        expectedIrq=cpu.maskableIrqShadow;
        expectedTerminated=cpu.terminated;
      }
      return Object.freeze({...snapshot(),reason:segment.reason,
        sliceSteps:segment.steps,irq});
    }catch(error){
      state='FAULTED';
      childFrame=captureDosCpuFrame(cpu);
      restoreParent();
      throw error;
    }finally{running=false;}
  };
  const abort=()=>{
    if(running)throw new Error('cannot abort executing DOS child');
    requireOwner();
    childFrame=captureDosCpuFrame(cpu);
    state='ABORTED';
    restoreParent();
    return snapshot();
  };
  const enqueueExternalIrqEdge=event=>{
    if(running)throw new Error('cannot enqueue hardware IRQ while guest runs');
    requireOwner();
    if(steps>=maxTotalSteps)
      throw new Error('external IRQ edge refused after original instruction budget: fail closed');
    return irqEdges.enqueue(event);
  };
  return Object.freeze({runSlice,snapshot,abort,enqueueExternalIrqEdge});
}
