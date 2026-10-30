# UW2 P4 boot: failed original resource loads must not enter MAIN (2026-10-31)

- Task: `CONVERSION-UW2-01607`.
- Source SSOT before patch: `8f2f967ef35bb4bcc4fa1d950ee8517f524c8a39`, existing master plan `ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md`.
- P1 direct original-byte evidence: Korean `KOEI.COM` launches `OPEN.EXE` before `MAIN.EXE`; the known conditional guard at raw `0x265..0x268` can bypass MAIN on a nonzero DOS termination type (see `ORIGINAL_P1_RELOCATION_LAUNCHER_20261031.md`). This does **not** prove browser asset-fetch errors are DOS termination types.
- Observed web-source defect: `web/app.js` uses `Promise.allSettled` on the required game-resource loaders, but advanced the `Uw2BootGate` even when some requests rejected. Thus a partially loaded set could reach the system menu; on some paths a load-button path also bypassed the gate.
- Implemented scoped correction: `web/boot-sequence.js` permanently marks a failed resource-set for the current boot; `web/app.js` fails closed on rejected loader promises and guards both system menu entry and selected-game start. Opening scene order, assets, game rules, music and input mapping are not changed.
- Synthetic regression (no copyrighted originals): failed-before-OPEN and failed-after-OPEN cases, poisoned-set no recovery, OPEN replay cannot bypass failure; existing ready ordering scenarios retained.
- GitHub Actions: `.github/workflows/uw2-web-fidelity.yml` runs Node syntax, boot gate, policy and synthetic MZ audit without original assets.
- **Scope/limits:** This is a P4 failure-boundary web correction, not a claim that browser boot equals DOS KOEI.COM, that all resource fetches are necessary on every original path, or that OPEN/MAIN semantics are fully reverse engineered. Original binaries and browser interaction were not executed in this task. `RUNTIME_VALIDATION=UNTESTED`.
- Next: use original DOS reference execution and recorded traces to distinguish fatal versus optional resource failures and confirm exact OPEN termination/skip -> MAIN branching and UI timing.
