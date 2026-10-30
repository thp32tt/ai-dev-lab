# P1 KOEI.COM DOS return guards → web boot gate (CONVERSION-UW2-01608)
Date: 2026-10-31 KST. Master: ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md.

## Exact original-byte evidence (pre-existing pinned Korean KOEI.COM)
- DOS EXEC wrapper raw 0x115: INT 21h AX=4B00h, then INT 21h AH=4Dh.
- OPEN return: raw 0x265 OR AH,AH; 0x267 JNZ +0x16 -> raw 0x27F. This bypasses MAIN.EXE at 0x269/0x26C when AH != 0.
- MAIN return: raw 0x26F OR AH,AH; 0x271 JNZ +0x0C -> raw 0x27F, bypassing END.EXE.
- MAIN return: raw 0x273 OR AL,AL; 0x275 JZ +0x0B -> raw 0x282, bypassing END.EXE if AL == 0.
- `tools/koei-launch-chain.mjs` checks these branch offsets and calculated target bytes against the user's original pinned SHA. This is static evidence, not a DOS trace.

## Implemented in web port
- `web/koei-exit-flow.js`: input-validated, deterministic OPEN→MAIN and MAIN→END return guard decisions from original AH/AL byte conditions. Rejects unknown programs and non-byte status inputs rather than inventing transitions.
- `web/boot-sequence.js`: when a *known* original DOS OPEN termination type is supplied, a nonzero AH blocks the MAIN menu and remains failed for this boot. Existing browser animation-completed flow is unchanged; it does **not** fabricate a DOS exit status.
- `tests/koei-exit-flow.test.mjs`: synthetic 0/1/2/255 status guards, boundary rejection, normal and failed boot; registered in GitHub Actions fidelity gate.
- No copyrighted original files included. No opening scenes, visuals, music, game rules or controls changed.

## Limits / next original fidelity gap
- Browser opening-player completion does not itself prove DOS AH=0; actual DOS EXEC/exit traces are needed before passing a DOS exit status from live runtime.
- Full P1 dispatcher/near-indirect calls, actual OPEN keyboard skip semantics and OPEN→MAIN real DOS memory/driver state remain unverified.
- Automated Node synthetic gate is distinct from actual original-binary/browser validation. RUNTIME_VALIDATION=UNTESTED.
