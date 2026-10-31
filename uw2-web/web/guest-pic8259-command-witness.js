// Raw original master PIC command-write evidence, port 20h only.
// A source-backed OUT 20h records the *actual* guest byte. This is not
// an emulated 8259A in-service register, interrupt priority, PIC masking,
// or a source for scheduled IRQ edges. No EOI side effect is fabricated.
export function createOriginalMasterPicCommandWitness({
  onCommand,maxCommands=4096
}={}){
  if(onCommand!==undefined&&typeof onCommand!=='function')
    throw new TypeError('original PIC command observer must be synchronous');
  if(!Number.isSafeInteger(maxCommands)||maxCommands<1||maxCommands>100000)
    throw new RangeError('original PIC command budget must be bounded');
  let commands=0,last=null;
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
    last=event;commands++;
  };
  return Object.freeze({
    port20:Object.freeze({out8}),
    snapshot:()=>Object.freeze({
      commands,last,
      fidelity:'ORIGINAL_GUEST_OUT20_COMMAND_ONLY__PIC_EOI_IRQ_PRIORITY_UNTESTED'
    })
  });
}
