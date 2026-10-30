import { RealMode8086 } from './realmode-8086.js';

// Korean KOEI.COM raw 0x265..0x276, cross-checked by tools/koei-launch-chain.mjs.
// Execute *only* the verified 8086 OR/Jcc slice, using synthetically assembled
// instruction bytes; no original binary or DOS runtime result is embedded.
// Actual DOS AH=4Dh results are not captured by this browser simulation.
const guards = Object.freeze({
  openAH: {at:0x265,register:'AH',modrm:0xe4,jcc:0x75,delta:0x16,target:0x27f},
  mainAH: {at:0x26f,register:'AH',modrm:0xe4,jcc:0x75,delta:0x0c,target:0x27f},
  mainAL: {at:0x273,register:'AL',modrm:0xc0,jcc:0x74,delta:0x0b,target:0x282},
});
function byte(value,label) {
  if(!Number.isInteger(value)||value<0||value>255)
    throw new RangeError(`${label} must be an unsigned DOS return byte`);
  return value;
}
export function executeKoeiReturnGuard(which,value) {
  const guard=guards[which];
  if(!guard)throw new RangeError('unknown original KOEI.COM guard');
  byte(value,which);
  const cpu=new RealMode8086();
  cpu.set8(guard.register,value);
  cpu.set16('IP',guard.at);
  cpu.load(Uint8Array.of(0x0a,guard.modrm,guard.jcc,guard.delta),0,guard.at);
  cpu.runSteps(2);
  if(cpu.ip!==guard.target&&cpu.ip!==guard.at+4)
    throw new Error('KOEI guard fell outside verified branch destinations');
  return cpu.ip===guard.target;
}
export function nextKoeiExecutable(completed,{terminationType,returnCode}={}) {
  const ah=byte(terminationType,'terminationType (AH)');
  const al=byte(returnCode,'returnCode (AL)');
  if(completed==='OPEN.EXE')
    return executeKoeiReturnGuard('openAH',ah)?null:'MAIN.EXE';
  if(completed==='MAIN.EXE')
    return executeKoeiReturnGuard('mainAH',ah)||executeKoeiReturnGuard('mainAL',al)
      ?null:'END.EXE';
  throw new RangeError('Only OPEN.EXE and MAIN.EXE guarded returns are verified');
}
