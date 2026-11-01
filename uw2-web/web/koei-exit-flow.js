// Native JavaScript port of the PROVEN Korean KOEI.COM OR reg,reg + Jcc
// return guards. The DOS CPU interpreter is deliberately restricted to
// offline differential tests, not shipped to the web game.

// Korean KOEI.COM raw 0x265..0x276, cross-checked by tools/koei-launch-chain.mjs.
// Source-backed JNZ/JZ semantics are implemented directly in JavaScript;
// an 8086 interpreter runs only in the isolated 768-case offline regression.
// DOS AH=4Dh status input is caller-provided; no game return is fabricated.
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
  // Original 0Ah /r OR AH,AH or OR AL,AL sets ZF iff value is zero.
  // This is the native web equivalent of the proven four-byte sequence,
  // without executing its guest x86 opcodes or emulating the DOS machine.
  const expectedModrm=guard.register==='AH'?0xe4:0xc0;
  const signedDelta=guard.delta&0x80?guard.delta-0x100:guard.delta;
  if(guard.modrm!==expectedModrm||
     ![0x74,0x75].includes(guard.jcc)||
     guard.target!==guard.at+4+signedDelta)
    throw new Error('KOEI original guard metadata inconsistent: fail closed');
  const zero=(value|value)===0;
  return guard.jcc===0x74?zero:!zero;
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
