// Exact original native DOS 21h/4B00h instruction-boundary child handoff.
// The parent may resume ONLY with the proven completion of an owned staged
// 8086 child. No synthetic child result, path guessing or DOS job scheduler.
import {RealMode8086} from './realmode-8086.js';
import {isStagedDosChildContinuation} from './dos-child-continuation.js';
import {captureDosCpuFrame,DOS_CPU_FRAME_NAMES} from './dos-com-child-runner.js';
const trustedHandoffs=new WeakSet();
export const isSourceBoundDosExecHandoff=value=>trustedHandoffs.has(value);
const frameSame=(a,b)=>DOS_CPU_FRAME_NAMES.every(k=>a[k]===b[k]);
const pathSource=cpu=>{
  const ds=cpu.get16('DS'),dx=cpu.get16('DX');
  const bytes=[];
  for(let i=0;i<260;i++){
    const value=cpu.read8(ds,(dx+i)&0xffff);
    if(value===0){
      if(!bytes.length)throw new Error('original DOS EXEC pathname is empty');
      // The actual original DOS adapter will validate this path again.
      return Object.freeze({
        filename:String.fromCharCode(...bytes),
        length:bytes.length,ds,dx
      });
    }
    bytes.push(value);
  }
  throw new Error('original DOS EXEC pathname exceeds 260 bytes');
};
export function createSourceBoundDosExecHandoff(cpu){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('original DOS EXEC handoff needs shared real-mode 8086');
  let phase='IDLE',pendingRequest=null,parent=null,child=null,readyResult=null;
  const ownsCpu=guest=>guest===cpu;
  const sourceRequest=()=>{
    if(!cpu.interruptAdapters.has(0x21))return null;
    const cs=cpu.get16('CS'),ip=cpu.get16('IP');
    if(cpu.read8(cs,ip)!==0xcd||
       cpu.read8(cs,(ip+1)&0xffff)!==0x21||
       cpu.get8('AH')!==0x4b||cpu.get8('AL')!==0)return null;
    return Object.freeze({cs,ip,filename:pathSource(cpu).filename,
      parameterBlockSegment:cpu.get16('ES'),
      parameterBlockOffset:cpu.get16('BX')});
  };
  const pending=()=>{
    if(phase==='CHILD_ACTIVE')
      return Object.freeze({...pendingRequest,reason:'WAIT_NATIVE_DOS_EXEC_CHILD'});
    const source=sourceRequest();
    if(phase==='IDLE'){
      if(!source)return null;
      pendingRequest=source;parent=captureDosCpuFrame(cpu);
      phase='WAITING_CHILD';
    }else{
      if(!source||Object.keys(pendingRequest).some(k=>pendingRequest[k]!==source[k]))
        throw new Error('original DOS EXEC source/owner changed before completion');
      if(!frameSame(captureDosCpuFrame(cpu),parent))
        throw new Error('original DOS EXEC parent frame mutated while paused');
    }
    return phase==='CHILD_READY'?null:
      Object.freeze({...pendingRequest,reason:'WAIT_NATIVE_DOS_EXEC_CHILD'});
  };
  const beginChild=stage=>{
    if(phase!=='WAITING_CHILD'||!isStagedDosChildContinuation(stage)||
       stage.snapshot().state!=='ACTIVE')
      throw new Error('DOS EXEC handoff requires one authentic active staged child');
    child=stage;phase='CHILD_ACTIVE';
    return Object.freeze({phase,filename:pendingRequest.filename});
  };
  const completeChild=stage=>{
    if(phase!=='CHILD_ACTIVE'||stage!==child||
       !isStagedDosChildContinuation(stage))
      throw new Error('DOS EXEC completion requires exact owned native child');
    const result=stage.snapshot();
    if(result.state!=='COMPLETED'||!result.result)
      throw new Error('DOS EXEC child has no verified DOS termination result');
    if(!frameSame(captureDosCpuFrame(cpu),parent))
      throw new Error('DOS EXEC child did not restore the suspended parent');
    const status=result.result;
    if(!Number.isInteger(status.terminationType)||
       status.terminationType<0||status.terminationType>255||
       !Number.isInteger(status.returnCode)||
       status.returnCode<0||status.returnCode>255)
      throw new Error('DOS EXEC child status not verified');
    readyResult=Object.freeze({
      terminationType:status.terminationType,returnCode:status.returnCode
    });
    phase='CHILD_READY';
    return Object.freeze({...readyResult});
  };
  // Wired directly into installDosInt21(cpu,{executeChild:handoff.executeChild}).
  // Only actual re-entered native INT21 AH4B after verified child can consume.
  const executeChild=request=>{
    if(phase!=='CHILD_READY'||!readyResult)
      throw new Error('DOS EXEC native child has not completed: fail closed');
    const expected={...parent,IP:(parent.IP+2)&0xffff};
    const current=captureDosCpuFrame(cpu);
    const frameDifferences=DOS_CPU_FRAME_NAMES.filter(k=>current[k]!==expected[k]);
    if(!request||request.filename!==pendingRequest.filename||
       request.parameterBlockSegment!==pendingRequest.parameterBlockSegment||
       request.parameterBlockOffset!==pendingRequest.parameterBlockOffset||
       frameDifferences.length)
      throw new Error('DOS EXEC completed status source mismatch: '+[
        request?.filename===pendingRequest.filename?'':'filename',
        request?.parameterBlockSegment===pendingRequest.parameterBlockSegment?'':'parameter-segment',
        request?.parameterBlockOffset===pendingRequest.parameterBlockOffset?'':'parameter-offset',
        ...frameDifferences
      ].filter(Boolean).join(',')+': fail closed');
    const result=readyResult;
    readyResult=null;pendingRequest=null;parent=null;child=null;phase='IDLE';
    return result;
  };
  const snapshot=()=>Object.freeze({
    phase,source:pendingRequest?Object.freeze({...pendingRequest}):null,
    ready:readyResult!==null,
    fidelity:'REAL_ORIGINAL_DOS_EXEC_PARENT_CHILD_RESULT_ONLY__NO_DOS_SCHEDULER'
  });
  const api=Object.freeze({pending,beginChild,completeChild,executeChild,
    snapshot,ownsCpu});
  trustedHandoffs.add(api);
  return api;
}
