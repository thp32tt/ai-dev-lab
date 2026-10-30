// Korean KOEI.COM raw 0x265..0x276: DOS AH=4Dh return-status guards.
// OPEN nonzero AH bypasses MAIN; MAIN nonzero AH or zero AL bypasses END.
// Proven *static* launch logic; not a captured DOS run or full game-state port.
function byte(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 0xff)
    throw new RangeError(`${label} must be an unsigned DOS return byte`);
  return value;
}

export function nextKoeiExecutable(completed, { terminationType, returnCode } = {}) {
  const ah = byte(terminationType, "terminationType (AH)");
  const al = byte(returnCode, "returnCode (AL)");
  if (completed === "OPEN.EXE") return ah === 0 ? "MAIN.EXE" : null;
  if (completed === "MAIN.EXE") return ah === 0 && al !== 0 ? "END.EXE" : null;
  throw new RangeError("Only OPEN.EXE and MAIN.EXE guarded returns are verified");
}
