// Raw original master PIC command-write evidence, port 20h only.
// Optional IRQ0 service gating is a strictly opt-in single-line 8259A
// approximation, starting from a caller-provided IRQ0 service state.
// No IRQ scheduler, priority arbitration, mask register or PIT clock exists.
import {RealMode8086} from './realmode-8086.js';

const witnesses=new WeakSet();
export const isOriginalMasterPicCommandWitness=value=>witnesses.has(value);

export function createOriginalMasterPicCommandWitness({
  onCommand,maxCommands=4096,irq0OwnerCpu,initialIrq0InService
}={}){
  if(onCommand!==undefined&&typeof onCommand!=='function')
    throw new TypeError('original PIC command observer must be synchronous');
  if(!Number.isSafeInteger(maxCommands)||maxCommands<1||maxCommands>100000)
    throw new RangeError('original PIC command budget must be bounded');
  const irq0GateEnabled=irq0OwnerCpu!==undefined;
  if(irq0GateEnabled&&!(irq0OwnerCpu instanceof RealMode8086))
    throw new TypeError('PIC IRQ0 gate needs one original shared guest CPU');
  if(irq0GateEnabled&&typeof initialIrq0InService!=='boolean')
    throw new TypeError('PIC IRQ0 gate requires explicit initial in-service state');
  if(!irq0GateEnabled&&initialIrq0InService!==undefined)
    throw new TypeError('PIC IRQ0 initial state requires a guest CPU owner');
  let commands=0,last=null,irq0InService=irq0GateEnabled?
    initialIrq0InService:null;
  let irq0Delivered=0,irq0Eois=0,unmatchedEois=0;
  const requireIrq0Owner=(cpu,edge)=>{
    if(!irq0GateEnabled||cpu!==irq0OwnerCpu)
      throw new Error('PIC IRQ0 requires exact opted-in guest CPU owner');
    if(!edge||edge.vector!==8||typeof edge.source!=='string'||
       !edge.source.trim())
      throw new Error('PIC IRQ0 gate admits only explicit IVT 08h source');
  };
  const canAdmitIrq0=(cpu,edge)=>{
    requireIrq0Owner(cpu,edge);
    return !irq0InService;
  };
  // Called *only after* the real guest CPU IVT dispatch succeeds.
  const confirmDeliveredIrq0=(cpu,edge)=>{
    requireIrq0Owner(cpu,edge);
    if(irq0InService)
      throw new Error('PIC IRQ0 cannot acknowledge two in-service entries');
    irq0InService=true;irq0Delivered++;
  };
  const out8=(port,value,cpu)=>{
    if(port!==0x20)
      throw new Error('original master PIC command must use port 20h');
    if(!Number.isInteger(value)||value<0||value>255)
      throw new RangeError('original master PIC command must be uint8');
    // Observed native FMDRV command 20h is the only admitted command. Others
    // need independent original DOS/device evidence before implementation.
    if(value!==0x20)
      throw new Error('unverified master PIC command byte: fail closed');
    if(!cpu||typeof cpu.get16!=='function')
      throw new TypeError('original master PIC command requires guest CPU');
    if(irq0GateEnabled&&cpu!==irq0OwnerCpu)
      throw new Error('original PIC EOI from non-owning guest CPU: fail closed');
    if(commands>=maxCommands)
      throw new Error('original master PIC command budget exhausted: fail closed');
    const event=Object.freeze({
      port,value,cs:cpu.get16('CS'),ip:cpu.get16('IP'),ordinal:commands
    });
    if(onCommand!==undefined){
      const response=onCommand(event,cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async master PIC command observer: fail closed');
      if(response!==undefined)
        throw new Error('master PIC observer cannot fabricate device state');
    }
    // The state transition is caused by this successful, original guest
    // OUT 20h,20h only. Never release service on IRET or elapsed host time.
    if(irq0GateEnabled){
      if(irq0InService){irq0InService=false;irq0Eois++;}
      else unmatchedEois++; // No inferred IRQ0 completion from stray EOI.
    }
    last=event;commands++;
  };
  const snapshot=()=>Object.freeze({
    commands,last,irq0GateEnabled,irq0InService,
    irq0Delivered,irq0Eois,unmatchedEois,
    fidelity:irq0GateEnabled?
      'OPT_IN_EXPLICIT_IRQ0_SERVICE_EOI_ONLY__PIC_PRIORITY_MASK_CLOCK_UNTESTED':
      'ORIGINAL_GUEST_OUT20_COMMAND_ONLY__PIC_EOI_IRQ_PRIORITY_UNTESTED'
  });
  const api=Object.freeze({
    port20:Object.freeze({out8}),
    canAdmitIrq0,confirmDeliveredIrq0,snapshot,
    ownsIrq0Cpu:cpu=>irq0GateEnabled&&cpu===irq0OwnerCpu
  });
  witnesses.add(api);
  return api;
}
