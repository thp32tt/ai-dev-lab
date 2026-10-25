# AI Competition Scoreboard

Updated: 2026-10-26 08:30:55 KST (Asia/Seoul)

## Latest confirmed cumulative scores

| AI | Cumulative score | Status |
| --- | ---: | --- |
| AI 1 — ChatGPT | **1666** | New source-grounded in-depth Memories plot reconstruction, +1 |
| AI 2 — ChatGPT2 | **1965** | PG/VAN weekly regulation brief (2026-10-26), official-source research +1 |


## AI 2 PG/VAN weekly regulation briefing (2026-10-26 08:30 KST)

- KST execution: 2026-10-26 08:30:55 KST (Asia/Seoul); AI: **AI 2 — ChatGPT2**; RUN_KEY: `AUTO:PG-VAN-REG-WEEKLY:20261026T082948+0900`.
- Previous confirmed cumulative score: **1964**. Change: **+1**. New confirmed cumulative score: **1965**.
- Reason: independently completed the 2026-10-19 to 2026-10-26 Korean PG/VAN weekly regulatory/security briefing, verified official FSC, PIPC, PHP upstream, PCI SSC and ISMS-P sources; differentiated enacted rules, proposed amendments, and guidance; provided prioritized practical actions and deadlines. One weekly delivery = one achievement. No duplicate scoring for retries or re-reporting.
- Verified material findings: FSC 2026-10-23 card-company quarterly PG settlement-risk evaluation **proposed** (comment through 2026-12-02); FSC 2026-10-21 credit-information penalty calculation **enacted 2026-10-23**; PHP2Shell upstream emergency fix 2026-10-21 and PIPC 2026-10-22 emergency guidance; PIPC 2026-10-19 API asset/credential hygiene; FSC 2026-10-21 specific prepaid-related innovation service designations. ISMS-P comment deadline 2026-10-26; no new PCI DSS v4.0.1 revision found.
- Official sources: https://www.fsc.go.kr/no010101/87984 ; https://www.fsc.go.kr/no010101/87973 ; https://www.fsc.go.kr/no010101/87975 ; https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&nttId=12588 ; https://www.php.net/archive/2026.php ; https://www.pcisecuritystandards.org/newsroom_overview/press_releases/ .
- AI 1 unchanged. Calculation: **1964 + 1 = 1965**.

## AI 2 DX9Ex independent REVIEW_ONLY 01498 (2026-10-26 07:09 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01498`; one new independent static conditional finding (+1), not a code fix or HMD pass.
- Source SSOT `thp32tt/OutRun2006Tweaks@81ab66dece5f875adc0e25cfa4c83c6b8d89d603` (`vr-d3d9ex-focus`): exact `RegisterSpriteNodeScope` before a frame with zero SpriteNode selections; `EndSpriteQueueFrame(false)` at healthy Present sees zero expire cutoff and retains the old exact tag; on a later untagged foreign node reuse at the same address without re-registration, the old serial can be consumed. Static conditional; actual absence of queue selections/address reuse/HMD symptom not observed.
- One-file docs-only `[AUTO:CONVERSION-DX9EX-01498]` commit `92222985b9ebd81475bd52e59c923af241e6f59a`, `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01498.md`, verified branch HEAD, GitHub compare ahead=1/behind=0, only 46 lines added/one path, remote blob `026401336d6d205cb1fa5205b82588bc556d699e`.
- `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. No duplicate scoring for this TASK_ID retry/rollover/further readback. AI 1 unchanged at 1666.
- **AI 2 score: previous confirmed 1963 + unique completed static review +1 = cumulative 1964.**

## AI 2 PR151 +TIME four-API R26 test completion (2026-10-26 00:01 KST)

- RUN_KEY / TASK_ID: `USER-DX9EX-PR151-TEST-20261025`; one new independent implementation + exact-SHA build/package outcome, +1. The earlier exploratory queue-root relaxation, CI retries, individual gates and artifact download are not separately scored.
- User-supplied PR #151 review was incorporated correctly: exact `StageExtensionTime` fixed-function FVF142 rendering now shares the existing R62 finite-HUD stereo transaction across DP/DIP/DPUP/DIPUP while GOAL, rival, lens/F11 and unrelated HUD admission remain bounded. The unvalidated GOAL/rival live-root relaxation was reverted before the validation-bearing SHA.
- Validation-bearing material SHA on `thp32tt/OutRun2006Tweaks/vr-d3d9ex-focus`: `0f8cfa8b2f64f3063a35d075f0f155bc22ff1aee`.
- Exact-SHA GitHub Actions SUCCESS: R26 User Test Build `40204229644`; General R26+HUD `40204229626`; Active Validation `40204229653`; HUD Inspector `40204229740`; Domain Isolation `40204229612`; Full Source Impact `40204229603`. The Full Source gate explicitly ran the actual-source four-API +TIME regression. PC Fast remained skipped.
- Runnable user artifact `12603750588` includes x86 `dinput8.dll`, x64 `outrun-vr-host.exe`, `RUN_DX9EX_TEST.cmd`, PowerShell runner, INIs and exact `SOURCE_SHA.txt`. `RUNTIME_VALIDATION=UNTESTED`; no Quest3 optical fix is claimed before user testing.
- **AI 2 score: previous confirmed 1962 + 1 = 1963.** AI 1 unchanged at 1666.

## AI 1 new detailed retro Memories plot research (2026-10-25 22:58 KST)

- TASK_ID: `DIRECT-RETRO-MEMORIES-DETAILED-PLOT-20261025T2252KST`. Independent from earlier game identification/short synopsis: recovered concrete 50-year memory world, staged invitations and drugged tea, all six psychic analysts and differentiated objectives, specific mansion death mechanisms and the late Rieka-commissioned Lan Kohō rescue connection, using original Japanese game review, Japanese fandom snippets, 2025/2026 independent player retrospective and later-series continuity.
- Clearly separated sourced plot sequence from unverified fine-grained final scene and avoided conflating Vol.2 Memories with Vol.5 Nightmare. A walkthrough exists but original host denied remote page reads; did not falsely report reading full transcript.
- One new corroborated long-form research result +1, retrieval/search repetition +0.
- **AI 1 score: previous 1665 + 1 = 1666.** AI 2 unchanged at 1962.

## AI 1 independent Memories story synopsis (2026-10-25 22:53 KST)

- TASK_ID: `DIRECT-RETRO-MEMORIES-STORY-SUMMARY-20261025T2252KST`.
- New and distinct from previous game identification: verified story specifics through MobyGames, classicgame Japanese longform character/plot analysis and firsthand player reflections: distressed daughter Shoko, deceptive father Shotaro, drugged tea, 50-year memory-world confinement, other psychic analysts and the dead-lover obsession. Explicitly separated well-supported setup and spoilers from unverified final sequence; no fictional ending details invented.
- Unique user-requested researched story synopsis +1, same facts/reports +0 on retries/follow-ups.
- **AI 1 score: previous 1664 + 1 = 1665.** AI 2 unchanged at 1962.

## AI 1 independent retro-game identification (2026-10-25 22:16 KST)

- TASK_ID: `DIRECT-RETRO-MEMORIES-IDENTIFICATION-20261025T2214KST`.
- Completed: Identified the user's 1990s Korean DOS text adventure “메모리즈” as Data West's Psychic Detective Series Vol.2: Memories. Cross-checked primary platform chronology with MobyGames release records, PC98 game catalog, and independent Korean DOS collection pages, and located accessible game information and Korean launcher/archive listing pages (두기/레트로몬). Not claiming installer tested or download legal status determined.
- One independent discovery result +1; same identification, later lookup/status follow-ups +0 unless genuinely new task outcome.
- **AI 1 score: previous confirmed 1663 + 1 = 1664.** AI 2 unchanged at 1962.

## AI 2 menu/game render separation completion (2026-10-25 22:15 KST)

- RUN_KEY / TASK_ID: `USER-DX9EX-MENU-RENDER-SEPARATION-20261025`; exactly one functional outcome, +1. No separate credit for test repairs, refresh guard, CI retries or evidence commits.
- Implemented independent title/main 4:3 MenuScale, provider-independent startup OpenXR game source selection, saved-scale cached-image refresh and same-owner failed-config lookup preservation. R26+HUD, HUD 0.55 and wide selectors retained. A separate fixed-resolution menu render target is not claimed.
- Material commits: `b65c346da8481706f4bf80a42e41f011065950f2`, `74fdf953b197a0109fc83a807b5396e75f3b5aed`; final integrated validation SHA `8b7e06ce68eff3cb74847a6a4ff88449913fda7d` on thp32tt/OutRun2006Tweaks vr-d3d9ex-focus.
- Exact-SHA PASS: [Active game/host/package](https://github.com/thp32tt/OutRun2006Tweaks/actions/runs/40195919150), [Domain](https://github.com/thp32tt/OutRun2006Tweaks/actions/runs/40195919128), [HUD Inspector](https://github.com/thp32tt/OutRun2006Tweaks/actions/runs/40195919024), [Full Source](https://github.com/thp32tt/OutRun2006Tweaks/actions/runs/40195919174). Active artifact 12599727417; inner ZIP SHA256 BAB9E0CAF2C433368DFF1B067190F7E9310FE54F9CCEE83895B64A4EC61E98F0.
- Durable evidence: docs/automation/runs/USER-DX9EX-MENU-RENDER-SEPARATION-20261025.json and docs/automation/reviews/MENU_RENDER_SEPARATION_20261025.md. RUNTIME_VALIDATION=UNTESTED; no Quest3 optical/FPS or HMD baseline promotion claim.
- Score: **1961 + 1 = 1962**. AI 1 remains **1663**.

## Latest independent AI 2 Quest REA source recovery (2026-10-25 21:30 KST)

- RUN_KEY: `DIRECT-QUEST-REA-SEVEN-FUNC-CPP-20261025T2105KST` — exactly one achievement (+1), no duplicate credit for repeated function reads or documentation commits.
- Material result: REA 6.5.0 with Ghidra 12.1.4 successfully analyzed **7 byte-identical native Quest AArch64 function slices** with Evidence IDs, input SHA256s, 14,688 observed function-body bytes, while noting partial call coverage and pseudocode limitations. Full 22MB ELF REA import timed out after 260 seconds and is not claimed successful.
- Independent C++ recovery: generated **12,393-character** research-only `body_correction_from_guest_matrices` C++ from 211 FP/memory operations in 229 exact ARM64 instructions, verified 16 output slots and 3 synthetic fixture cases. This is not HMD or compiler-verified equivalence.
- GitHub result on `thp32tt/OutRun2006Tweaks` `vr-d3d9ex-focus`: `docs/research/quest_cockpit_body_correction_reconstructed_20261025.cpp`, fixture JSON, seven-REA-function manifest JSON, and `QUEST_APK_REA_XR_COCKPIT_IMPLEMENTATION_RECOVERY_20261025.md` (last research material commit `c0bd73a333ded2056be37025c6ff652160acb39a`; target HEAD and four exact paths read back).
- Source ELF SHA256 `fa0f9db9b744515a9a1439741bc9806ad007470b621b88d22a0b8cbced6120b6`. DX9Ex=REVIEW_ONLY, CODE_CHANGE=NO, BUILD=NOT_RUN, HMD RUNTIME_VALIDATION=UNTESTED. AI 1 remains **1663**.
- **Score:** previous 1960 + new independent source-recovery outcome 1 = **1961**; no repeat score for same RUN_KEY.

## Latest AI 2 new independent Quest cockpit matrix-lifecycle and glass analysis (2026-10-25 20:36 KST)

- Time: 2026-10-25 20:36 KST; RUN_KEY: `DIRECT-QUEST-COCKPIT-MATRIX-UNWIND-GLASS-20261025T2022KST`.
- Distinct from previous corrected-Ghidra-address recovery: independently verified exact Quest APK cockpit mode-1 **render-frame state lifecycle** from original bounded ARM64: guest camera +0xF0..+0x12C 16-float matrix is temporarily rewritten to identity (bit-exact diagonal indices 0,5,10,15), after separate 16-float cockpit/body-correction calculation, then fully restored in both normal 0x10CC78C..7D0 and exception/unwind 0x10CC910..968 paths; both clear active TLS. Independent script verified 16/16 offset coverage on each path, no duplicated/missing stores, and identity arithmetic.
- New associated materials cross-check: independently reran 31 APK player-PMT inventories; 48 broad tinted candidates, only 47 match the actual native alpha 0.55/0.425 ±0.001 gate, excluding obj_plcar_f50_pmt.sz object0/material3 alpha 0.5. The more specific material/mesh identity and runtime D3D9 blend have NOT been proven. Missing Ghidra PLT callees were trial-defined read-only, but inflated pseudocode **did not shrink**; no false decompiler-completion claim.
- New research commit: `thp32tt/OutRun2006Tweaks@e46d25a13edcf76181bac904bd133829d010c318`, exact docs path `docs/research/QUEST_APK_COCKPIT_MATRIX_LIFECYCLE_GLASS_PMT_CROSSCHECK_20261025.md`, independent GitHub readback blob `03f630f13584996aed5c4db114912422efb30d0a`.
- Verified N100 source ELF SHA256 `fa0f9db9b744515a9a1439741bc9806ad007470b621b88d22a0b8cbced6120b6`; local machine-checkable evidence `quest20261025_matrix_lifecycle_verified.json`. Source policy: DX9Ex REVIEW_ONLY, CODE_CHANGE=NO, BUILD=NOT_RUN, HMD RUNTIME_VALIDATION=UNTESTED.
- Scoring: previous confirmed AI 2 **1959** + exactly **1** novel material recovered behavior/report = AI 2 cumulative **1960**. No extra points for the several tools, reruns, decompiler setup, related report updates or this event's duplicate readbacks. AI 1 remains 1663.

## New unique AI 2 Quest source recovery result (2026-10-25 20:19 KST)

- RUN_KEY: `DIRECT-QUEST-GHIDRA-CORRECTBASE-20FUNC-20261025T2002KST`
- **NEW INDEPENDENT MATERIAL ACHIEVEMENT**: fixed N100 Ghidra project `IMAGEBASE=0x100000` vs AArch64 ELF virtual address mapping; formerly failed `halt_baddata` driver/cockpit shader and rendering functions are now decompilable at correct function bounds. Three focused Ghidra recoveries generated C-like outputs for 20 unique native functions across cockpit body, glass PMT, vehicle/driver/occupant, GLES state and OpenXR eyes/hands; fourth independent machine-code pass cross-checked control-flow boundaries.
- Source integrity: original user ARM64 ELF SHA256 `fa0f9db9b744515a9a1439741bc9806ad007470b621b88d22a0b8cbced6120b6`, independently recomputed. Exactly 13,053/13,053 instructions decoded, 20/20 Ghidra completion results, 727,941 pseudocode characters, 16/20 files with unresolved Ghidra warnings. Full original authored C++ not recovered; no runtime proof claimed.
- New durable research GitHub result: `thp32tt/OutRun2006Tweaks` `vr-d3d9ex-focus` commit `2934ec4cebd8592f6ee9568bee45a7b37bc8fec6` plus independent bounded-branch cross-check `964e925173f40496aa064ecf4f57d845675c7cbd`; remote document readback blob `8ecfd1ee5ed262e55750efca2fa1c1292a5af192`, path `docs/research/QUEST_APK_GHIDRA_REBASE_COCKPIT_RECOVERY_20261025.md`.
- N100 local evidence: `apk/_analysis_focus/quest20261025_recovery_manifest.json`, three `correctbase*20261025` directories (proprietary-derived C-like pseudocode private), `quest20261025_controlflow_bounded.json`; no game code or proprietary binary uploaded to GitHub.
- Scope: `REVIEW_ONLY`, `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`; stable R26+HUD and DX11 source unaffected.
- All four loops are **one achievement**, not four separate scores. Re-readback/rollover/retry/restatement of this exact same success adds **+0**.
- Calculation: **AI 2 previous confirmed 1958 + one new completed unique source-recovery/evidence achievement +1 = 1959**. AI 1 unchanged.

## Latest AI 2 unique offline reverse-engineering event (Quest cockpit/glass 2026-10-25)

- Time: 2026-10-25 19:52 KST
- AI: AI 2 — ChatGPT2
- RUN_KEY: `DIRECT-QUEST-COCKPIT-GLASS-A64-20261025T1938KST`
- Novel independent finding: on exact SHA-identified user-owned Quest ARM64 library, extracted previously unexpanded `Flush::draw_404700` condition chain. Entry flag and category, D3D-style source/destination blend getters (19/20), 0.55/0.425 ±0.001 source alpha tests, draw-scoped 0.25 opacity and premult flag, and obligatory 1.0/false post-draw restoration verified through AArch64 assembly. Independently correlated mode-1 cockpit matrix writer and 16-float driver body transform consumer.
- Material research commit: `thp32tt/OutRun2006Tweaks@eabca21e6c0a0e5944600308b78839afe9a8c7d5` on `vr-d3d9ex-focus`; remote document readback blob `79348f024d2ebd8e6c3e0351ad260610906a42b0`, path `docs/research/QUEST_APK_COCKPIT_GLASS_FULL_TRACE_20261025.md`.
- Validation: read-only native executable disassembly + material-specific condition verification. `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. Documented remaining glass polygon identity and runtime blend ambiguity rather than claiming in-game patch or success.
- Duplication: one new independently recovered source-grounded condition set and single committed report = one achievement; disassembler runs, readback, follow-up reports or future retests of this identical finding earn **+0**.
- Calculation: **AI 2 previously confirmed 1957 + this genuinely novel verified analysis and permanent report +1 = cumulative 1958.** AI 1 remains 1663.

## Latest AI 2 DX11 source/C6 scoring event (01063)

- Time: 2026-10-25 18:03 KST
- AI: AI 2 — ChatGPT2
- TASK_ID / RUN_KEY: `AUTO:CONVERSION-DX11-01063`
- Unique new integrated DX11 source achievement: the native menu/car/race full-frame synchronous GPU consumer now detaches and restores actual D3D11 game OM/CS output state, and the existing two-eye GPU/OpenXR shared ring supports genuine local BGRA8 typeless game camera textures when a matching typed RTV proves its exact physical mip/slice and linear/sRGB color interpretation. Independent L/R physical sources, device and COM identity, producer EVENT, transport generation and ACK, original D3D9 Draw/Present/gamepad/FFB fallback remain fail-closed. No DXVK changes.
- Material source commit: `edae1b3a4262d542882a3157e583ac6fafffadd1`; causal negative-mutation CI test repair and **validation-bearing exact SHA**: `d15329a5b901bbc369b0fa3e943d1938717fb2b0`; post-Gate C6 bookkeeping-only SHA: `13bb428e34c031225dd8f1d278bb34c75e35e049`. Neither validation-bearing commit has CI-skip; only post-Gate C6 bookkeeping does.
- Exact-SHA five GitHub Actions **SUCCESS**: DX11 Fast `40177607780`, Backend `40177607633`, Windows Build `40177607719`, OpenXR architecture `40177610379`, HUD Inspector `40177610288`. Dedicated portable C++ two-eye source admission and destructive Python source-link regressions passed within Fast.
- Validation: `COMPLETE_BUILD_VERIFIED` / `PASS_EXACT_SHA`, `RUNTIME_VALIDATION=UNTESTED`. There is no same-SHA physical game-native draw count, game-visible native screen, independent Quest3/VDXR stereo/FFB or menu 4:3 theater measurement. No gameplay or headset promotion.
- Uniqueness: One new source+full-Gate achievement earns only **+1**; the failed first SHA, regression repair, duplicate Actions, checkpoint and C6 do not independently score. AI 1 unaffected.
- Calculation: **AI 2 previous confirmed 1956 + one independent 01063 source/CI achievement +1 = cumulative 1957.**

## Latest AI 2 DX11 source/C6 scoring event (01062)

- Time: 2026-10-25 17:02 KST
- AI: AI 2 — ChatGPT2
- TASK_ID / RUN_KEY: `AUTO:CONVERSION-DX11-01062`
- One new integrated DX11 native GPU frame capability: full-size real-game D3D11 color texture with verified producer ownership and pixel extent is now eligible for independent-resolution native GPU sink, without inheriting the D3D9 desktop-size restriction. Actual native texture format, mip/array/sample and owning device are checked; original strict D3D9Ex shared desktop crop/dirty-region rollback, Draw/Present, original gamepad and FFB remain fail-closed.
- Implementation SHA: `44494c8f0ffad0138ae3c7dd3ffe8701942d78bf`; causal source-link negative-mutation regression repair and final validation-bearing SHA: `fb339c7a7740c19ecec2777e5310d9cd2657366d`; separate post-Gate C6-only commit: `ef992e0199bb327f3f793dabd2e3942104d9ccfe`. No CI-skip on either validation-bearing result commit; only C6 bookkeeping uses `[skip ci]`.
- Five identical exact-SHA GitHub Actions **SUCCESS**: Fast `40173587197`, Backend `40173587220`, Windows Build `40173587171`, OpenXR architecture `40173587163`, HUD Inspector `40173587208`. Portable 01062 C++ consumer-geometry positive/negative checks and source-link destructive regressions ran within Fast. The repaired mutation test re-scoped its edit to the actual GPU-only source block, without weakening any safety assertion.
- Validation: `COMPLETE_BUILD_VERIFIED` / `PASS_EXACT_SHA`; `RUNTIME_VALIDATION=UNTESTED`. No physical OutRun Draw count/native published frames, real visible 4:3 theater result, Quest3/VDXR stereo output or FFB hardware result. No automatic native promotion, DXVK remains frozen.
- Uniqueness: New 01062 source+five mandatory Gate result earns **one** independent +1 achievement; failed SHA, regression-only repair, repeats, C6 and checkpoint produce no extra points. AI 1 unaffected.
- Calculation: **AI 2 previous confirmed 1955 + one independently completed 01062 source/CI achievement +1 = cumulative 1956.**

## Latest AI 2 DX11 source/C6 scoring event (01061)

- Time: 2026-10-25 15:53 KST
- AI: AI 2 — ChatGPT2
- TASK_ID / RUN_KEY: `AUTO:CONVERSION-DX11-01061`
- Unique implemented native DX11 GPU frame source integration: actual complete native menu/vehicle/race color textures with mipmaps can copy mip-zero to the existing bounded, fenced D3D9Ex shared-desktop path. Compatible BGRA8 UNORM, sRGB and single-sampled typeless storage are handled with format-aware GPU CopyResource/CopySubresourceRegion and cached resolve-target format checks; ambiguous array/eye slices, unproved MSAA, and unsupported sources fail closed to original D3D9 game Present/input/FFB.
- Material source commit: `12e329badf2982d8547b8a3e91ebfedea19eddd5`. Inherited 01060 C6 acceptance metadata was repaired to unblock a real Fast policy Gate failure in same task. Validation-bearing source/repair commit: `75898b79367e818d389b003ead7f42b3f9df8015`. Post-Gate C6-only checkpoint commit: `28503bcd527654fedb61b6b37c1eb88c096aea42`, with `[skip ci]` ONLY on this post-Gate C6 commit, not on the validation-bearing SHA.
- Five same-SHA GitHub Actions **SUCCESS**: DX11 Fast `40169900853`, Backend `40169900809`, Windows Build `40169900803`, OpenXR `40169900798`, HUD Inspector `40169900857`. The new 01061 portable C++ layout probe and structural negative-mutation regressions passed on the same validated source SHA.
- Scope: `COMPLETE_BUILD_VERIFIED` / `PASS_EXACT_SHA`, `RUNTIME_VALIDATION=UNTESTED`. Native draw/published-frame counts in a real game launch, actual Quest3/VDXR and FFB hardware have not been measured; no game/HMD playable claim. DXVK frozen.
- Uniqueness: Exactly one new independent 01061 source+five-Gate achievement is scored. CI policy repair of prior 01060 record, retries, post-Gate C6, and status checks score **+0** separately. AI 1 unchanged.
- Calculation: **AI 2 previous confirmed 1954 + one independently completed 01061 source/CI achievement +1 = cumulative 1955.**

## Latest AI 2 DX11 source/C6 scoring event (01060)

- Time: 2026-10-25 14:56 KST
- AI: AI 2 — ChatGPT2
- TASK_ID / RUN_KEY: `AUTO:CONVERSION-DX11-01060`
- Unique new implemented source integration: authentic current D3D9 menu/car/race backbuffer CPU staging now supports a private same-format scratch GPU RT when direct GetRenderTargetData fails in a native D3D11 multi-dirty-region publication transaction; nested R30 StretchRect hook is suppressed while State::mutex is held. If readback cannot complete, no partial native pixels are published and original D3D9/input/FFB fallback remains unchanged.
- Material game/source commit: `06990acebcfd7e518374d48d3c88e5d07745d89e`; actual Fast CI regressions for historical 00769, 00754, 00767 were repaired within SAME TASK_ID. Validation-bearing exact SHA: `73e2e57a3e100a381eff13068f971b5b887340e3`. C6-only bookkeeping commit: `b6282743556ba408c76a6d2a0ee2bda29f68618f` on `thp32tt/OutRun2006Tweaks/vr-dx11-native-r71`.
- Five GitHub Actions same-SHA **SUCCESS**: DX11 Fast `40166287560`; Backend `40166287542`; Windows Build `40166292412`; OpenXR `40166292416`; HUD Inspector `40166292398`. 01060 source-link regression and prior fallback/protection regressions PASS. CI-skip applied only to post-Gate C6 bookkeeping commit, not validation-bearing result.
- Scope: `COMPLETE_BUILD_VERIFIED` / `PASS_EXACT_SHA`, `RUNTIME_VALIDATION=UNTESTED`; no actual OutRun source Draw counts, menu/race pixels, Quest3/VDXR, or gamepad/FFB hardware runtime claim. DXVK unchanged.
- Uniqueness: The source/CI/C6 record is ONE independent 01060 integration achievement. Its multiple Gate retries, failure repairs, checkpoint, previous SHA and new source-link regressions are **not** additional scores. AI 1 unchanged.
- Calculation: **AI 2 previous confirmed 1953 + one newly completed 01060 source/CI achievement +1 = cumulative 1954.**

## Prior AI 2 DX11 source/C6 scoring event (01059)

- Time: 2026-10-25 13:48 KST
- AI: AI 2 — ChatGPT2
- TASK_ID / RUN_KEY: `AUTO:CONVERSION-DX11-01059`
- Unique new completed implementation: D3D9 native game source-copy full-frame readback fallback via a private same-format GPU render target, together with R30 hooked StretchRect recursion suppression under State::mutex, exact owner/size/format admission, Reset lifetime and fail-closed original D3D9 fallback. Result source commit: `697c96ad6956fec38e95643bcafa509dfcdf8de7` on `thp32tt/OutRun2006Tweaks/vr-dx11-native-r71`; C6-only bookkeeping commit: `1ec39e6e1da8eedecd7baec68dd6b9e8a4dc6c15`.
- Exact-SHA five mandatory GitHub Actions **SUCCESS**: DX11 Fast `40162429648`; Backend `40162429562`; Windows Build `40162429600`; OpenXR `40162429610`; HUD Inspector `40162429590`. Dedicated source mutation regression 01059 PASS in Fast log. No CI-skip on the validation-bearing result.
- Explicit bounds: `COMPLETE_BUILD_VERIFIED` / `PASS_EXACT_SHA`, `RUNTIME_VALIDATION=UNTESTED`; no real game Draw counts, menu/race visibility or Quest3/VDXR gameplay claims. Original FFB and DX9Ex fallback preserved in source.
- Uniqueness: source + acceptance record are one independent 01059 implementation achievement; no duplicate score for its C6/status readback, retry, same-SHA CI duplicate or rollover. AI 1 unaffected.
- Calculation: **AI 2 previous confirmed 1952 + independent new DX11 01059 completed achievement +1 = cumulative 1953.**

## Previous AI 2 DX11 source/C6 scoring event

- Time: 2026-10-25 12:05 KST
- AI: AI 2 — ChatGPT2
- TASK_ID / RUN_KEY: `AUTO:CONVERSION-DX11-01058`
- Unique achievement: DX11 native D3D9 cropped game-tile late-staging failure recovery materially committed in OutRun2006Tweaks source SHA `192c19543b39ddbcdd81ae405e51691446b3a833`; actual Backend CI failure and inherited 01056/01055/00886 regression failures repaired in the SAME task. The five mandatory GitHub Actions **SUCCESS** on identical validation-bearing SHA `f941d0146f833b6bf1bab1d3e13ae316d1f9061d`; durable C6 record committed at `5db0b69f840b07511f1c22b6cbbee3973346c2a1`.
- Verified gates: DX11 Fast 40155776799; Backend Gate 40155776800; Windows Build 40155776804; OpenXR 40155776793; HUD Inspector 40155776844.
- Distinguish proof: `COMPLETE_BUILD_VERIFIED`, `PASS_EXACT_SHA`; real OutRun/Quest3/HMD gameplay `RUNTIME_VALIDATION=UNTESTED`. No claim of playable native DX11 frames.
- Duplication: This +1 is for one genuinely new material feature with completed source/C6 evidence. Rollovers E001/E003, inherited 01057 bookkeeping repair, retries, failed runs, and repeated successful checks are **not** separately scored.
- AI 1 score unchanged.
- Calculation: **AI 2 previous confirmed 1951 + this independent completed achievement +1 = cumulative 1952.**

## Latest AI 2 수도권 연간이용권 모니터링 event

- Time: 2026-10-25 08:07 KST
- AI: AI 2 — ChatGPT2
- Previous confirmed score: **1950**
- Change: **+1** (fresh search and verification completed; no new user-facing qualifying offer; user-defined monitoring-completion scoring rule)
- New confirmed score: **1951**
- RUN_KEY: `AUTO:CAPITAL-ANNUAL-PASS:20261025T0807KST`
- Result: No independently verified newly launched/reopened weekend-eligible season/annual/multi-visit pass with a meaningful new benefit beyond previous alerts on 2026-10-25. Avoided duplicate alert.
- Sources: [SEA LIFE COEX official 2026 flash sale](https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/y26-ap-single-flash-sale/) (79,000 KRW, official campaign through 2026-10-31; previously notified); [official channel schedule](https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/promotions/annual-pass-promotion/) (MyRealTrip 2026-10-24 to 26; platform product not directly accessible in web read); [Woongjin Playdoci official admission](https://playdoci.com/Common/Pop_FeeInfo.aspx) (regular low-season pricing, not a new pass). Other Seoul Land, Aqua Planet Ilsan, One Mount, Everland, and local family facilities were searched; no qualifying newly verified multi-use sale identified.
- AI 1 score unchanged. One unique completed monitoring event; no duplicate scoring for this RUN_KEY.
- Calculation: **AI 2 previous confirmed 1950 + this independent completed monitoring +1 = cumulative 1951.**

## AI 2 latest independent scoring event

- Event ID: `DIRECT-DX11-C6-QUEUE-RECOVERY-20261025T0730`
- Recovery: Retrieved N100 live controller status. DX11 `CONVERSION-DX11-01053` was stuck in WAIT_ACTIONS after exact SHA `65efec460053277ff1f071f1f2a8bd31f2874b80` Backend and DX11 Fast Actions completed successfully. Persisted its C6 exact-SHA bookkeeping without rebuilding source, and observed live controller terminal PASS at 2026-10-25 07:23:58 KST.
- New dispatch: N100 live check showed `CONVERSION-DX11-01054` submitted at 2026-10-25 07:30:24 KST; maintained DX9Ex hourly :00 and DX11 hourly :30.
- Prevent recurrence: [VR controller C6 recovery source](https://github.com/thp32tt/OutRun2006Tweaks/commit/432dec1d5001627d598bc6843b13e6223186c8d5) and [offline regression tests](https://github.com/thp32tt/OutRun2006Tweaks/commit/e7e419a31af823979ab93141aeb9ae83cd090260) confirmed Python AST and 10/10 tests PASS. Deployment of updated source code to live Portainer is still pending; immediate queue recovery and new dispatch verified on live controller.
- Uniqueness: Record-only repair of previous TASK_ID 01053 does not score again as a new DX11 feature. This +1 is for the independently verified VR controller scheduling recovery and new task dispatch only.
- **AI score: previous confirmed 1949 + this achievement +1 = cumulative 1950.**

## Latest AI 1 direct OCR recovery event

- Event ID: `OUTRUN-DIRECT-OCR-RECOVERY-20261025T1650KST`
- Time: 2026-10-25 16:50 KST
- Task: Recovered the stalled OutRun Korean localization OCR pipeline without an external API by directly inspecting verified original HD PNGs, validating canonical translations/source SHA values, deriving safe text/card bboxes, and atomically injecting 13 missing native ROI entries into the production manifest.
- Result: production manifest increased **831 → 844**. A was staged as `OUTRUN-ROI-A-0075-E7998BD0` with 5 items. B was staged as `OUTRUN-ROI-B-0088-16DFF698` with 5 items and was runtime-confirmed sent through the existing ChatGPT browser controller at **2026-10-25 16:50:28 KST**, reaching `SENT_AWAITING_GENERATED_IMAGES` with persisted chat URL. Generated-image completion remains pending and is not claimed.
- Safety/provenance: source PNG SHA/DDS SHA and reviewed Korean mappings were preserved; old 986 split tiles and external OCR/OpenAI APIs were not used. Manifest/state backups were created before direct mutations.
- Uniqueness: one score for the combined direct-recovery + runtime dispatch achievement; individual recovered phrases, restaging operations, retries, and later status checks are not separately scored.
- Calculation: **AI 1 previous confirmed 1662 + 1 = cumulative 1663.**

## Latest unique scoring event

- Event ID: `OUTRUN-C1-20261025T0615KST-A0069-A0070-NEW-SHA5`
- Task: SHA-level C1 inventory audit discovered five previously unreviewed N100 Korean RGBA candidate files omitted by the 05:45 file-count-only IDLE conclusion: A-0069 ordinals 341-343 and A-0070 ordinals 347-348. Excluded eight SHA entries already reviewed in the 05:15 GitHub QA record. Independently checked five actual candidate/source SHA-256 pairs, approved mapping and legible glyphs, RGBA alpha/border transparency and unwanted original art.
- Result: **PASS 0, FAIL 0, HOLD 5**. No obvious standalone text defects, but native UI-cell and protected-art placement unverified. No C2/C3/DDS/game PASS.
- QA record: `localization/qa_reports/C1_20261025_0615_A0069_A0070_SHA5.json` in `thp32tt/OutRun2006Tweaks@6e5f83c475b8adeee30aa41b33f4f06b9540c15d`; remote asset branch HEAD confirmed.
- Calculation: **AI 1 previous confirmed 1661 + this new independent SHA5 QA achievement +1 = cumulative 1662**.
- Duplication rule: This five-SHA QA event counts once; later repeats/reports/status checks of these hashes are +0.

## Previous unique scoring event

- Event ID: `OUTRUN-C1-20261025T0515KST-A0068-A0069-A0074-NEW-SHA8`
- Task: Independently inspected eight previously unreviewed SHA-256-verified N100 Korean transparent PNG outputs: A-0068 (5), A-0069 (2), A-0074 (1). Checked actual byte SHA-256, source provenance/mapping manifest, Korean visual legibility, image alpha and boundary safety. Excluded B-0087 SHA already reviewed at 04:15.
- Result: **PASS 0, FAIL 0, HOLD 8**. Text and alpha were valid in standalone outputs; native UI-cell registration and adjacent protected-art safety remain unverified. No C2/C3/DDS/game PASS.
- QA record: `localization/qa_reports/C1_20261025_0515_A0068_A0069_A0074_SHA8.json` in `thp32tt/OutRun2006Tweaks@aed94893b2e8c8512903c911a4c1bb2adfdd0bb8`. Remote branch HEAD independently confirmed identical.
- Calculation: **AI 1 previous confirmed 1660 + this new independent QA achievement +1 = cumulative 1661**.
- Duplication rule: This SHA8 QA event counts once; later repeat/recheck/reports of these hashes are +0.

## Previous unique scoring event

- Event ID: `OUTRUN-C1-20261025T0445KST-A0072R1-A0073-NEW-SHA8`
- Task: Independently reviewed eight previously unreviewed SHA-256 verified N100 Korean RGBA PNG outputs (A-0072-R1 remaining three, A-0073 five). Checked export hashes, source SHA against production manifest, mapping, image transparency, readability, and alpha/canvas edges.
- Result: **PASS 0, FAIL 1, HOLD 7**. Ordinal 360 (EASY→쉬움) includes a solid green protected UI left-arrow in the generated lettering-only layer; other seven candidates require native target-cell placement verification. No C2/C3/DDS/game PASS.
- QA record: `localization/qa_reports/C1_20261025_0445_A0072R1_A0073_SHA8.json` in `thp32tt/OutRun2006Tweaks@b04a30bae3c4276c80a01ce304a537ace3283399`. Remote branch HEAD confirmed identical via commit compare.
- Calculation: **AI 1 previous confirmed 1659 + this new independent QA achievement +1 = cumulative 1660**.
- Duplication rule: This SHA8 QA event counts once; retries/reports/rechecks of these eight candidate hashes are +0.

## Previous unique scoring event

- Event ID: `OUTRUN-C1-20261025T0415KST-B0086-B0087-A0072-NEW-SHA8`
- Task: Independently inspected 8 new SHA-256-pinned N100 Korean RGBA candidates: B-0086 (5), B-0087 (1), A-0072-R1 (2). Verified actual bytes against export hashes and source/translation manifests, compared original/candidate contact sheets, and inspected edge-alpha pixels.
- Result: **PASS 0, FAIL 0, HOLD 8**. Korean lettering readable and mappings correct; native target-cell registration and adjacent protected art remain unverified. B-0086 ordinal 415 bottom-edge alpha=1 (4 pixels); B-0087 ordinal 419 left-edge alpha=1 (7 pixels), neither warrants a clipping FAIL.
- QA record: `localization/qa_reports/C1_20261025_0415_B0086_B0087_A0072_SHA8.json` in `thp32tt/OutRun2006Tweaks@e8d7851c404c9a1607164030cfda1e44135e2835`. Remote branch HEAD independently confirmed identical.
- Calculation: **AI 1 previous confirmed 1658 + this independent new SHA8 QA achievement +1 = cumulative 1659**.
- Duplication rule: This event counts once; repeat QA, retries or reporting of the same eight SHA values are +0.

## Older unique scoring event

- Event ID: `OUTRUN-C1-20261025T0345KST-B0085-A0071-NEW-SHA7`
- Task: Independently verified seven previously unreviewed OutRun 2006 Korean RGBA PNG SHA-256 candidates: B-0085 (5), A-0071 remaining two (2). Actual N100 bytes match export SHA-256 and source/translation manifests; visual Korean lettering inspected.
- Result: **PASS 0, FAIL 0, HOLD 7**. Text readable, approved mappings agree, output transparent RGBA. Native UI cell registration/protected graphics placement unverified; no C2/C3/game/DDS pass.
- QA record: `localization/qa_reports/C1_20261025_0345_B0085_A0071_SHA7.json` in `thp32tt/OutRun2006Tweaks@134c3f6e1647e9210cab6ee5f9f91be838769bc1`. GitHub remote branch HEAD independently confirmed.
- Calculation: **AI 1 previous confirmed 1657 + this independent new SHA7 QA achievement +1 = cumulative 1658**.
- Duplication rule: Event counted once only; repeat QA, retries, rollover or status checks of the seven SHA values are +0.

## Previous unique scoring event

- Event ID: `OUTRUN-C1-20261025T0315KST-B0084R1-A0071-NEW-SHA8`
- Task: Independently checked eight previously unreviewed SHA-pinned OutRun 2006 Korean RGBA PNG candidates: B-0084-R1 (5) and A-0071 (3). Verified actual local byte SHA-256, export manifests, English-to-Korean mapping, visual lettering and alpha edges.
- Result: **PASS 0, FAIL 0, HOLD 8**. Text is readable and mapping matches; native UI cell and protected-art placement remain unverified. A-0071 ordinal 349 has only near-zero alpha (<=7) on 31 total edge pixels, not sufficient to assert visible clipping.
- QA record: `localization/qa_reports/C1_20261025_0315_B0084R1_A0071_SHA8.json` in `thp32tt/OutRun2006Tweaks@f85465ca037b913b45433d143fd21040ff697436`. Remote HEAD confirmed identical to commit via GitHub compare.
- Calculation: **AI 1 previous confirmed 1656 + this independent new SHA8 QA achievement +1 = cumulative 1657**.
- Duplication rule: This event counts once; rechecks, retries or reporting of the same eight candidate hashes are +0.

## Older unique scoring event

- Event ID: `OUTRUN-C1-20261025T0245KST-B0083-A0070-NEW-SHA8`
- Task: Independently reviewed eight previously unreviewed SHA-pinned OutRun 2006 Korean PNG candidates from B-0083 (5) and A-0070 (3).
- Result: **PASS 0, FAIL 1, HOLD 7**. Verified against the actual exported candidate SHA and source manifest. QA evidence committed to `thp32tt/OutRun2006Tweaks@9fff3d2fe5a7dcb70a0012bd19840be4567e2237`, with remote branch HEAD independently confirmed identical.
- QA record: `localization/qa_reports/C1_20261025_0245_B0083_A0070_SHA8.json`.
- Calculation: **AI 1 previous confirmed 1655 + this new achievement +1 = cumulative 1656**.
- Duplication rule: This event counts once; rechecks or later reports of the same eight candidate SHA-256 hashes are +0.

## Previous unique scoring event

- Event ID: `OUTRUN-C1-20261025T0215KST-B0082-NEW-SHA5`
- Task: Independent C1 QA of five newly SHA-verified OutRun 2006 B-0082 Korean PNG candidates.
- Result: Five HOLD, no unverified PASS; report committed as `thp32tt/OutRun2006Tweaks@448af386a86108ccd49c390e679da3794d70bc73`.
- Calculation: **AI 1 previous confirmed 1654 + this achievement +1 = cumulative 1655**.
- Duplication rule: Count this event only once; later report verification, retry, or recheck of the same five candidate SHAs is +0.

## Baseline restoration note

The prior `AI_SCOREBOARD.md` on `main` was empty when checked on 2026-10-25. The 1654 AI 1 earlier starting baseline comes from the latest user-confirmed cumulative score in conversation history, not from a zero reset. No AI 2 baseline can be inferred from the empty file.
