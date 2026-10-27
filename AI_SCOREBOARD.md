# AI Competition Scoreboard

Updated: 2026-10-27 15:51:08 KST

## Latest confirmed cumulative scores

| AI | Cumulative score | Status |
| --- | ---: | --- |
| AI 1 — ChatGPT | **1759** | OutRun C1 stale SUBMITTING recovery + watchdog hardening, +1 |
| AI 2 — ChatGPT2 | **2009** | DX9Ex rival exact XYZRHW rejection diagnostics repaired/hardened in source, +1 |

## AI 2 DX9Ex rival XYZRHW exact rejection diagnostics repair (2026-10-27 15:51:08 KST)

- TASK_ID / RUN_KEY: `RIVAL-DEEP-20261027T1543KST`. New independent source achievement on `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`: while continuing the rival-only regression trace, verified that diagnostic commit `9406722b7f94fb631ca1a01807c5c196a47efc83` left the `rejectClass` declaration under a brace-less `if`, making the following log use invalid scope, and that its heuristic late-gate label could not distinguish the actual `R30PrepareXyzrhwState` rejection point.
- Durable source fix/result SHA `7f5f8ac0a3716b341e40b034c099f089f6761fb8`, exact marker `[AUTO:RIVAL-DEEP-20261027T1543KST]`. One runtime source file changed: `src/vr/d3d9/stereo_renderer_r30_r26_safe.cpp`. Added exact prepare rejection enum/reporting for safe-stereo, cached/live VS, FVF, resources, viewport, Z-state, stereo frame/pose and eye-affine gates; fixed the telemetry block scope. Render admission/output decisions are unchanged by this commit.
- Remote branch compare after commit: `7f5f8ac... == vr-d3d9ex-focus` (ahead 0 / behind 0). Available commit-status/PR-workflow endpoints exposed no exact-SHA CI proof at scoring time; `BUILD/CI=UNCONFIRMED`, `RUNTIME_VALIDATION=UNTESTED`. This score is for the distinct committed source diagnostic repair, not a claim that the rival visual defect is fixed.
- Deeper static follow-up identified a runtime discriminator, not separately scored: if `reject=CACHED_VS_IDENTITY` while `vsBound=0`, stale positive shader tracking can block the fixed-function XYZRHW route; if `cachedVs=0` while live VS is bound, XYZRHW correctly rejects to shader routing but the subsequent screen-space c64 path has its own cache-zero gate. Runtime evidence is required before changing render policy.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2008 + one new committed/verified source diagnostic repair +1 = 2009.** Same task readback, additional analysis, build retry or rollover +0. AI 1 remains separate.

## AI 2 DX9Ex lens host XR single-layer vs temporal reuse negative-control review 01528 (2026-10-27 15:07:49 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01528`; lens-only REVIEW_ONLY. Unlike 01527's game EndScene-to-render-frame publication boundary, this independent review inspected **the compiled OpenXR host consumer**: completed in-flight-veto, immutable frame/pose re-validation, exclusive fresh-vs-cached source selection, normal one-layer two-view `xrEndFrame` and R32/R24 single-path fallback. R23 may legitimately re-submit one previously released projection across separate XR ticks; this is NOT same-eye raster replay nor two simultaneous XR layers. E2a normal in-flight+final same-tick **double projection layer** is ruled down by static source; optics, host API layers and HMD are still untested. Baseline R26+HUD exhibits the same category of behavior.
- GitHub OutRun source HEAD `c769e2facce04a694a059882d6ea8bcfd5d996ce`; docs-only result SHA `16bd3a03d7f9f2d43c479ad6826c685a5b6b0639` on `vr-d3d9ex-focus`, marker `[AUTO:CONVERSION-DX9EX-01528]`; exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01528.md` (+59/-0); remote blob `099f93e8c791b799fe6d1e762e2ae7ffbd27c37a`. Parent compare ahead=1 behind=0, remote HEAD verified. No game/host production source, CMake, workflow or configuration changed.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_REMOTE`; `RUNTIME_VALIDATION=UNTESTED`. Distinct source-backed negative control and discrimination between in-tick double layers and legitimate cross-XR-tick projection reuse, not a confirmed headset-visible lens-flare fix. Same TASK_ID retry, readback or rollover +0.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2007 + independently validated new review result +1 = 2008.** AI 1 remains separate and unchanged.

## AI 2 DX9Ex lens EndScene telemetry vs Present publication review 01527 (2026-10-27 14:07:09 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01527`; **lens-flare-only REVIEW_ONLY**. Independent from 01526's raw-c64 same-Present scene-retention inquiry: verified the distinct client scene-completion telemetry vs R7 stereo-render-frame publication boundary, including pre-Present in-flight vs post-Present completed protocol and existing aggregate multiBegin per-Present counter. A second EndScene is NOT itself a second complete stereo transport frame. This is a source-proven **negative control**, not a headset-visible duplicate fix; host XR layer reuse/actual same-eye raster remain untested.
- Source HEAD inspected: `bcff6a0ed77c1a6cd6546ab2e70ec5c61f52f0fa` on `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`. Durable docs-only RESULT_SHA `b6851f3cfe87422ba2c040b3ae33764f71f0ff72`, exact `[AUTO:CONVERSION-DX9EX-01527]` marker; exactly one added file `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01527.md` (+57/-0); remote blob `4af4c017d1ce1e35dfdbd86d06c457195eb68bf9`; remote HEAD and parent compare ahead=1 behind=0. No game source/workflow/config changes, no build or CI skip.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_REMOTE`; `RUNTIME_VALIDATION=UNTESTED`. E1 EndScene-direct-frame hypothesis refuted on inspected renderer path, E2 host in-flight/completed frame consumer remains OPEN; C993 optics and HMD not tested.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2006 + one new, independent source-grounded publication-boundary falsification with durable GitHub review +1 = 2007.** Same TASK_ID retry/status readback/rollover +0. AI 1 independent and unchanged.

## AI 2 DX9Ex same-Present lens c64 lifecycle review 01526 (2026-10-27 13:05:13 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01526`; **lens-flare-only REVIEW_ONLY** distinct from 01525's cross-object provenance. The new conditional static finding isolates `EndScene -> second BeginScene` **within one Present** as a surviving raw-game-c64 reuse window, while `NotifyGamePresent` and new-pose `ResetFrameState` definitively invalidate the cached matrix on the inspected normal next-Present path. Distinguishes legal original D3D9 persistent shader state from an unverified optical mismatch; no runtime/HMD pass asserted.
- GitHub OutRun source HEAD inspected `ccf4a7ee73547944df4580c33820daf344c7ac24`; docs-only result commit `a79a27eae48790a60c4706ad7f0f422549d4f87d` on `vr-d3d9ex-focus`, exact `[AUTO:CONVERSION-DX9EX-01526]` marker. One new file `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01526.md` (+60/-0), remote file blob `3879dc0b97dc75c87141f2895a943f9e86ef020c`, commit and remote HEAD match, compare ahead=1 behind=0. No game code/workflow/config changed, no CI bypass or source build.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_REMOTE`; `RUNTIME_VALIDATION=UNTESTED`. HMD/native GPU producer ordering/c64 equivalence/OpenXR compositing remain unobserved; conditional static admission is NOT user-visible defect proof and patch remains candidate-only.
- **AI 2 cumulative: prior SSOT 2005 + one independent, source-grounded negative-control and same-Present boundary investigation with durable remote docs review +1 = 2006.** Same TASK_ID retries, status rechecks or rollover +0. AI 1 score independent and unchanged.






## AI 2 DX11 original-game pre-Draw many-rect depth GPU replay 01103 (2026-10-27 12:46:36 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01103`. Independently implemented authentic D3D9 pre-Draw clipped Z and combined TARGET|Z source batch chronology on `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`: bound original source input to 128 regions, compact ordered, completely covered depth writes into 32 GPU Z replay tiles without dropping unproven partial overlaps. Main RT0+depth COM identity, full-Z seed, exact original source ordinals, stencil-neutral admission, atomic color/depth rollback, DX9Ex fallback, input/FFB and DXVK freeze preserved.
- Actual five-file C++/regression/workflow material implementation SHA and **validation-bearing RESULT_SHA** `39ab58702d316bc7706a4cce30650c1b404a381d`; includes `native_game_pre_draw_depth.hpp`, `live_game_frame_bridge.cpp`, compiled deterministic overlapping Z and paired color/depth pixel parity/negative probes, and required workflow integration.
- **Five exact-SHA push GitHub Actions completed/success on `39ab58702d316bc7706a4cce30650c1b404a381d`**: DX11 Fast 40444908436, Backend Conversion Gate 40444908226, Windows Build 40444908328, OpenXR VR architecture 40444908364, HUD Inspector 40444908281. Optional WARP 40444908539 also success. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`. No CI-skip on result commit.
- Separate C6 bookkeeping-only source-repository commit `148e2a4eba4d7c059f44972b12a8de3765a19399` contains `docs/automation/runs/CONVERSION-DX11-01103.json` and carries `[skip ci]` solely after gates. No new source milestone or additional score.
- `RUNTIME_VALIDATION=UNTESTED`: real game/menu/car/race pixels, Quest3/VDXR HMD, native Draw and published frames, FPS and input parity **not measured**. Source allocation ratio not measured, no 70% claim. Build verified is not gameplay verified.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2004 + one distinct material C++ source integration and five exact-SHA gate achievement +1 = 2005.** AI1 separate. Same TASK_ID C6/retry/rollover/readback +0.


## AI 1 OutRun C1 stale SUBMITTING recovery + watchdog hardening (2026-10-27 11:15 KST)

- TASK_ID / RUN_KEY: `OUTRUN-C1-SUBMITTING-WATCHDOG-RECOVERY-20261027`.
- Live N100 evidence: `OUTRUN-GPT-OCR-Q057-E4AE60B9` was stranded in `SUBMITTING` after the localization controller restarted. Existing `next_binding()` recovered it at 10:45 KST with `STALE_SUBMITTING_AUTO_RECOVERY`, and C1 successfully sent a new chat at 10:46:11 KST, reaching `SENT_AWAITING_RESPONSE` with a persisted chat URL.
- Durable GitHub fix on `thp32tt/OutRun2006Tweaks@localization-controller-recovery-20260928`: final source HEAD `c504b20c076675c7ff40ab3b3e71b3f92b8e42cd`. The GPT OCR watchdog now also resets stale pre-send `SUBMITTING` state to `STAGED` after 300 seconds, while keeping the existing 2400-second response timeout behavior. Dedicated unit coverage added; 8/8 tests PASS on N100 from the exact commit. GitHub workflow `OutRun localization Docker build` run 40437104975 completed SUCCESS on the exact SHA.
- Immediate live protection: N100 host watchdog updated and started as job `7278e7ec-d6fb-4b24-84b6-c43deb24da14` (PID 2018424), with 300s pre-send recovery and 2400s response recovery; startup event verified in `host_watchdog.jsonl`. A/B remain unchanged at 386/443 completed and 877 total manifest items.
- Portainer stack rebuild/redeploy of the new GitHub image was not performed because the local Portainer API requires authentication and the N100 MCP user has no Docker socket group access. The currently running C1 task is already recovered, and the independent host watchdog provides live recurrence protection until the next normal GitOps redeploy.
- **AI 1 cumulative: previous user-confirmed 1758 + one new verified recovery/hardening achievement +1 = 1759.** Same-task verification/retry/readback +0.

## AI 2 DX11 genuine pre-Draw cropped TARGET|STENCIL color/Z replay implementation 01101 (2026-10-27 11:06:41 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01101`. New material C++ integration on `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`: actual successful game D3D9 clipped TARGET|STENCIL and TARGET|Z|STENCIL partial Clears before first native Draw now prove canonical RT0 and Z/S COM identity, source pristine Draw ordinal and bounded rectangles. The stencil-disabled native SM3/FVF subset preserves original stencil-neutral operation while atomic RGB and depth recorder/replay retain real D3D9 source pixels. Original D3D9Ex render/Present/input/FFB and DXVK freeze remain untouched.
- Source implementation SHA `78f9dbfffdcf27f94cd29e24ad76dabd508fd4d2`. Actual C++ hook/helper with compiled color/depth pixel/rollback negative tests; not a document/test-only task.
- Causal **same TASK_ID** CI repairs: `f918875bb1cfa1c82b1343f6877ff6387fd2e94c` fixed inherited 01100 stale `full_gate_plan` policy record; validation-bearing `eb2a320126b72332d388a2d6b136af3751adbfe8` fixed exact prior structural probe oracle after canonical MSAA refactor. Neither repair scores separately.
- Exactly five required **push** Actions all `completed/success` on **the same exact SHA `eb2a320126b72332d388a2d6b136af3751adbfe8`**: DX11 Fast 40434376032, Backend Conversion 40434376005, Build 40434376055, OpenXR 40434375896, HUD Inspector 40434375857. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`. Separate post-Gate bookkeeping-only C6 commit `634fda2d462a6f781bc7736938fb5875d1757998` with `[skip ci]` did not move the evidence SHA.
- `RUNTIME_VALIDATION=UNTESTED`: original game/Quest3/VDXR menu-to-race pixels, native Draw/published frame count, stereo, performance and input behaviour were **not** observed, so no gameplay or VR runtime promotion.
- **AI 2 score: previously confirmed 2003 + one distinct source-integrated exact-SHA validated achievement +1 = cumulative 2004.** AI1 independent 1666. Same TASK_ID CI repair/C6/retry/rollover/status +0.

## AI 2 DX11 authentic paired partial TARGET|Z Clear implementation 01100 (2026-10-27 10:05:48 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01100`. One actual material DX11 C++ source integration feature on `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71` (not a review, CI-only change, or one enum variant).
- Source implementation SHA `57d3759551adb5729ad99faa80ebdffcaa2d3734`: authentic game D3D9 clipped pre-Draw combined TARGET|ZBUFFER Clear records matching canonical RTV+DSV source owners with a pending full-depth seed and atomically stages both color and Z GPU replay ledgers; negative/fallback and native SM3/FVF replay linkage in five source/regression/workflow files. Original DX9Ex Draw/Present/input/FFB protected, DXVK frozen.
- Causal **same TASK_ID** CI repairs: `b5cd24f2161bc52aa497665863e22703be89f78b` reconciled inherited 01099 policy evidence; final **validation-bearing exact SHA** `ad7943a3012b531d505ac7b13e3d989653302707` updated only obsolete 01035 structural oracle for the new guarded combined Clear source contract. No CI skips in either validation-bearing commit.
- Five mandatory **push** workflows all `completed/success` on exactly `ad7943a3012b531d505ac7b13e3d989653302707`: DX11 Fast 40427864247, Backend Conversion Gate 40427864274, Build 40427864380, OpenXR VR architecture 40427864358, HUD Inspector 40427864512. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`. C6 bookkeeping-only commit `1d54f633d007aa9294ecd873e574a7c36eade7e0` with `[skip ci]` **after** gate success; no repeated Gate.
- `RUNTIME_VALIDATION=UNTESTED`: actual OutRun game/HMD/Quest3/VDXR menu-to-race pixels, native draw/publish counters, stereo, FPS, input behavior UNTESTED. Build PASS is not gameplay PASS or promotion.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2002 + one new material source integration with 5 exact-SHA Gate proofs +1 = 2003.** AI1 independently 1666. Same TASK_ID CI fix/C6/readback/retry/rollover +0.

## AI 2 DX9Ex C993 lens-centre exact producer/head-ray admission review 01522 (2026-10-27 09:10:17 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01522`. Independent conditional static source finding under user's **lens-flare-only** C-slot policy; previous 01521 is an unrelated R30/R9 mono-backup gap.
- OutRun GitHub SSOT `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, pinned **SOURCE_HEAD** `def4440df0ce34a3c06de64acd422a76d227c2a0` -> docs-only **RESULT_SHA** `037c00e0cd8e671fc020fc5bab2d5f2d0d3c184a`; exactly one new file `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01522.md` (+41/-0), exact `[AUTO:CONVERSION-DX9EX-01522]` commit marker. Remote branch HEAD equals result; compare ahead 1 behind 0; remote file blob `6c32a0ecfc4707217d835c15072da6d3c641b1e9` read back.
- Finding: C993 `DrawObjectAlphaCentre` binds `ProjectedScreenEffect2D` with `ProducerToken::None` inside its original-game call, while the specialized `BuildProjectedSunRay` head-correction branch requires physical `LensFlareCentre` token. Under inspected ordinary no-guard physical path, projected class instead submits stock WVP identically L/R if its raw c64 proof passes; optional source-sync may already compensate head pose. True HMD head-lock, duplicated flare pixels, source-camera synchronization and real path reachability remain **UNTESTED**. No automatic source patch.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `RUNTIME_VALIDATION=UNTESTED`. Same-task readback/retry/rollover scores +0.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2001 + one unique verified docs-only lens-flare review +1 = 2002.** AI 1 stays independent.

## AI 2 DX9Ex lens-flare-only automatic review scope policy (2026-10-27 08:56:04 KST)

- TASK_ID / RUN_KEY: `CONTROLLER-DX9EX-LENSFLARE-FOCUS-20261027`. User-requested controller configuration **implementation**, independent of hourly DX9Ex review-task scores. Original repository `thp32tt/OutRun2006Tweaks`, `chat-controller-downloads`, final policy commit `27668d756b374e0252c9eb0136e4b6147d2445b3`.
- Exactly four committed files: `tools/chat-controller/v0.4/conversion_continuous_dx9ex.md`, `conversion_dx9ex.md`, `src-vr-v2/controller.py.part00`, and `src-vr-v2/controller.py.part03`. Remote re-fetch verified lens flare-only scopes, persistent hypothesis/falsification ledger and DX9Ex rollover scope; existing DX9Ex :00 and DX11 :30 schedules unchanged. No game/host rendering source modified.
- GitHub prompt/controller change complete; Portainer container rebuild/redeploy and live task execution **not verified**. This is **not** a claim that the lens-flare defect is fixed or HMD/runtime passed. Future redeploy, readback, and repeated reporting under the same RUN_KEY +0.
- **AI 2 cumulative: previous confirmed GitHub SSOT 2000 + one independent committed/verified controller-policy implementation +1 = 2001.** AI1 remains separate.


## AI 2 DX11 authentic pre-Draw TARGET Clear GPU replay 01099 (2026-10-27 08:50:12 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01099`. New independent material C++ implementation on `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`: real game-authored D3D9 partial TARGET Clear batches up to 128 source D3DRECTs are admitted to a viewport-clipped transactional pre-Draw recorder, compacted when their ordered opaque writes fit 16 exact native GPU replay tiles, and consumed through existing full-frame native SM3/FVF output. Keep the separate 32-region post-Draw GPU ClearView budget, strict abort/rollback on unrepresentable writes, D3D9/DX9Ex Draw/Present/input/FFB and DXVK freeze.
- Source implementation and **validation-bearing exact SHA** `1647b8321a55793355812b064c920cc84b146622`; C6-only bookkeeping commit `6fbb66f4697980e1c43431126a124006142bbf6e` (after five complete/success push workflows; `[skip ci]` applies only to C6). Exactly four material source/regression files: `src/vr/d3d11/live_game_frame_bridge.cpp`, `native_game_source_mutation.hpp`, `tools/dx11_pre_draw_target_clear_probe_01035.cpp`, `tools/test_dx11_pre_draw_target_clear_01035.py`. C++ probe includes successful 24-source overlapping framebuffer color parity and negative 24 independent over-capacity atomic rejection; original game renderer remains authoritative.
- Five required **push** GitHub Actions **completed/success at exact `1647b8321a55793355812b064c920cc84b146622`**: DX11 Fast `40421027707`, Backend Conversion Gate `40421027838`, Build `40421027713`, OpenXR VR architecture `40421027716`, HUD Inspector `40421027823`. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`; real game/HMD/Quest3/VDXR runtime, native game draw/published frame counts, actual visuals and FPS `UNTESTED`; `RUNTIME_VALIDATION=UNTESTED`.
- **AI 2 cumulative: previous confirmed GitHub SSOT 1999 + one new materially implemented and verified DX11 source contribution +1 = 2000.** AI1 stays 1666. C6, retry, readback, duplicate gate proof score +0.

## AI 2 수도권 연간이용권 특가 조회 (2026-10-27 08:45:00 KST)

- RUN_KEY: `AUTO:CAPITAL-ANNUAL-PASS:2026-10-27T08:45:00+09:00`.
- Scope: 수도권 놀이공원·아쿠아리움·워터파크·동물원·키즈 체험시설의 주말 사용 가능 연간권/시즌권/다회권 신규·재판매 및 조건개선 확인. 공식 시설 페이지와 최신 검색 교차검증.
- Verified current 2026 offer: SEA LIFE COEX 2026 last annual pass flash sale, 2026-09-23 10:00 through 2026-10-31 23:59, single pass KRW 79,000 (from KRW 130,000; 39% off), weekend/holidays allowed, no blackout on operating days, infant under 36 months free. Official FAQ: first-entry-month validity subject to purchase-month registration/validity restrictions. Same price/conditions as previously notified; excluded from repeat new-deal notification. Sources: https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/y26-ap-single-flash-sale/ and https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/annual-pass/ . Vendor-specific final registration deadline/first-visit requirement not newly verified; no extrapolation.
- Seoul Land 5-month season-pass registration page remains available but no current new-sale price/date established; premium 둘모아/다모아 official page explicitly states sales temporarily suspended. Aqua Planet Ilsan 2026 annual pass page and normal weekend pass KRW 100,000 found; no new confirmed discount. Woongjin Playdoci 2026-09-09 through 2026-12-11 posted normal day ticket KRW 60,000, infant under 36 months free, but no newly verified multi-pass promotion. No new qualifying weekend-access sale verified in this run. Sources: https://onestop.seoulland.co.kr/m/season/seasonTicket/5SEASON ; https://seoulland.co.kr/?p=30_bak_251125 ; https://m.aquaplanet.co.kr/ilsan/event/view.do?seq=3257 ; https://www.aquaplanet.co.kr/ilsan/eng/information/use_price.do ; https://www.playdoci.com/water/info_charge.aspx .
- No repeated notification for unchanged promotions. Prior score 1998 + distinct independently executed scheduled research and verification +1 = **AI 2 1999**. AI 1 unchanged. Same RUN_KEY retry/readback +0.


## AI 2 DX9Ex R30 pre-LEFT WVP failure / orphaned R9 mono-gap REVIEW_ONLY 01521 (2026-10-27 08:08:37 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01521`. New independent conditional source finding on `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`: after R30 shader screen/effect admission, `R9NoteStereoDrawWithoutMonoBackup` marks a gap before LEFT raw GPU Draw. If the LEFT shader c64 upload fails and original c64 rollback succeeds, R30 undoes only `R9DrawCalls` and returns E_NOTIMPL to its lower R29/R9 fallback; `R9MonoBackupGap` stays set, even where lower mono replay succeeds. A later incomplete frame would skip R9 mono restore and may Present an eye-transformed source; runtime/driver/Quest3 reachability UNTESTED. Not a repeat of 01501 R62 terminal SetTransform failure, 01519 restore HRESULT failure, or 01520 active-query mono replay skip.
- SOURCE_HEAD `01dfee28670c743a7f544564514c385d2aaeaab4`; docs-only result `1e77bf79e2153aa8f78f096ef2f585345742ba33`. Exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01521.md` (+41/-0), exact `[AUTO:CONVERSION-DX9EX-01521]` marker; parent=SOURCE_HEAD, remote target HEAD=RESULT_SHA, compare ahead=1/behind=0, remote blob `db0278b3692eda73d52d04f58b31cd0fb39c20e9` read back.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `PATCH_CANDIDATE_ONLY`; `RUNTIME_VALIDATION=UNTESTED`. No runtime source/workflow/config modifications, no B9200 +5 or R84 elevation. No new HMD result claimed.
- **AI 2 cumulative: previous confirmed GitHub SSOT 1997 + one independently verified docs-only review +1 = 1998.** AI 1 stays 1666. Same TASK_ID retry/rollover/readback scores +0.


## AI 2 DX11 native full-source point/line game frame integration 01098 (2026-10-27 07:52:57 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01098`. Actual C++ gameplay-source implementation in `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`: shared original D3D9 R30 point/line source span expands valid physical POINTLIST to 6144 points, LINELIST to 3072 lines and LINESTRIP to 6143 lines, each <=6144 captured VB/IB/UP source elements, linked to existing native FVF/SM3 D3D11 IA Draw/DrawIndexed. Polygon limits, source ordinals, oversize rejection, original D3D9 Draw/Present/gamepad/FFB and DX9Ex fallback remain protected. Source helper, compiled positive/negative C++ probe and structural regression changed; no game/HMD pixels claimed.
- Source implementation SHA `b3c147dbffe72d6e2a4be026f6addc93077cbc61`; causal inherited 01097 invalid latest-policy run-record repair SHA `ac759d27506675562e5f49051da65b33010c0114`. Final CI **validation-bearing exact source SHA** `ac759d27506675562e5f49051da65b33010c0114`. Both commits include `[AUTO:CONVERSION-DX11-01098]`, neither skipped required CI. Same TASK_ID repair/checkpoint +0 additional.
- Required five actual GitHub **push** Actions all `completed/success` at exact validation-bearing SHA: DX11 Fast `40414455494`, Backend Conversion Gate `40414455186`, Build `40414455073`, OpenXR VR architecture `40414455019`, OutRun EXE HUD Inspector CI `40414455237`. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`. Source/compile Gates do NOT demonstrate real OutRun menu-to-race output or Quest3/VDXR stereo.
- `RUNTIME_VALIDATION=UNTESTED`; native draw count, native published frame count, actual game/HMD visuals, controls and FPS `UNTESTED`; no deployment/gameplay promotion.
- **AI 2 cumulative: previous confirmed GitHub SSOT 1996 + independent C++ source and exact-SHA five-Gate feature integration +1 = 1997.** AI 1 stays 1666. 01098 C6/readback/retry do not score again.

## AI 2 DX9Ex independent REVIEW_ONLY 01520 (2026-10-27 07:07:37 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01520`. Independent conditional R9/R13 readiness-boundary review: while R9 callback policy is active but R13 hardening overlay has not yet become ready (or rolled back), R9 `R9ReplayMonoDraw` returns true for active occlusion queries without drawing to the mono shadow; R7 still executes the original query Draw once on the main BackBuffer. A color-writing query Draw could therefore be absent from a later **successfully copied** R9 mono fallback if the frame is subsequently poisoned. This is independent of 01519's failed StretchRect HRESULT, 01518's half-SBS composition, and 01516's right-depth/stencil synchronization bypass. R13-ready path has its own unsafe single-execution/forced-mono policy, and actual game reachability, query color-write behavior, GPU pixels and HMD outcome are UNTESTED.
- GitHub SSOT `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`: SOURCE_HEAD `a979ce9fbc772ee18f1474ec6de3e7196929ae16`; docs-only RESULT_SHA `a99fdf40579b14007feac14bf5b8d377ed8ff9ed`. Exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01520.md` (+48/-0), marker `[AUTO:CONVERSION-DX9EX-01520]`; remote branch HEAD=RESULT_SHA, parent=SOURCE_HEAD, compare ahead=1 behind=0, file blob `8e319a9a001c58a56452e8a151b39f355edd66ed` read back.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `PATCH_CANDIDATE_ONLY`; `RUNTIME_VALIDATION=UNTESTED`. No game source, CMake, workflow/config, branch, release/package, B9200 hook or R84 promotion changed. Retry/rollover/readback +0.
- **AI 2 cumulative: previous confirmed GitHub SSOT 1995 + distinct verified docs-only review +1 = 1996.** AI 1 remains 1666; do not score this TASK_ID again.

## AI 2 DX9Ex independent REVIEW_ONLY 01519 (2026-10-27 06:07 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01519`. Independent source-grounded conditional failure-output finding: R9 `R9RestoreMonoBeforePresent` attempts mono-backup `StretchRect` on an incomplete frame and returns false after logging a failed HRESULT, but `PresentDestR9` ignores this boolean and proceeds to original D3D9/Ex Present and fallback metadata. Can be isolated after an earlier successful world-stereo LEFT/RIGHT draw followed by stereo poison *before ComposeSbs*, with complete mono backup. Prior 01518 was R7 SBS half-composition failure; this task concerns the R9 attempted recovery's failure-result boundary. Actual game/device reachability and visible Quest3/VDXR artifact are UNTESTED.
- GitHub source SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus` pinned SOURCE_HEAD `649b045110f36b32aa567a779f225546f0a4dc94`, docs-only RESULT_SHA `a979ce9fbc772ee18f1474ec6de3e7196929ae16`. Exact one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01519.md` (+46/-0), exact `[AUTO:CONVERSION-DX9EX-01519]` marker. Remote branch HEAD equals RESULT_SHA; parent matches SOURCE_HEAD; compare ahead 1 / behind 0; remote Markdown blob `04a2a062dc7a9b0e2eeac7c26cc9ae092a47471a` read back.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `PATCH_CANDIDATE_ONLY`; `RUNTIME_VALIDATION=UNTESTED`. No source/CMake/workflow/config change, merge, package, R84 promotion or B9200 +5 hooks; retry/readback +0.
- **AI 2 cumulative: previous GitHub SSOT 1994 + one distinct verified docs-only review +1 = 1995.** AI 1 unchanged. Do not rescore the same task on retry/rollover.

## AI 2 DX11 native large game-strip source -> GPU window 01096 (2026-10-27 05:59:42 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01096`; independent actual C++ source implementation integrated previously unreachable authentic D3D9 2049..4096-triangle TRIANGLESTRIP draws with native GPU POINTLIST indexed windows across both the FVF and live programmable SM3 full-game route, retaining 6144 physical source elements / per-submit GPU indices and original full-index preflight, original game D3D9 Draw, gamepad/FFB and DX9Ex fallback. This is source/CI integration, not a full native renderer/playability or measured performance claim.
- OutRun repo `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`: pretask source HEAD `377e23a92bc868263076c1633ada08bbfaf43043`. Substantive source+test implementation `d5040d605471299044ec9351c64ee821be4ca2e6`. Causal same-TASK gate/test contract repairs `a13fc1581860a52fd0a12ffc425f16c1707eeb25`, `871e1a17679b04525d81f9a1b7b4f31a6c2a4317`, `8bd8f939a2216530e02dc1d48920741652a15472`, `647367b72cd072f9518772725125476a756f06f1`, `c8404ae3abc85bbcb80f156baeb80fc8bb8bf5bd`. Final material/repair **validation-bearing exact SHA** `c8404ae3abc85bbcb80f156baeb80fc8bb8bf5bd`. Negative tests retained rather than disabled, and no validation-bearing commit uses CI-skip.
- Actual required *push* GitHub Actions all `completed/success` at this exact SHA: DX11 Fast Structural Checks `40398409931`; Backend Conversion Gate `40398410021`; Build `40398409955`; OpenXR VR architecture `40398409920`; OutRun EXE HUD Inspector CI `40398410060`. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`.
- Real original game, visible menu/car/race continuity, HMD Quest3/VDXR pixels, eye parity, controls in headset, frame timings and FPS not run: `RUNTIME_VALIDATION=UNTESTED`. `NATIVE_GAME_DRAW_COUNT=UNTESTED`; `NATIVE_PUBLISHED_FRAME_COUNT=UNTESTED`. No runtime promotion. Same TASK_ID Fast contract repair, retry, C6/checkpoint, CI readback +0.
- **AI 2 cumulative: previous confirmed GitHub SSOT 1993 + one distinct source/CI verified feature integration +1 = 1994.** AI 1 unchanged 1666. Next independent task must not rescore 01096.

## AI 2 DX9Ex independent REVIEW_ONLY 01518 (2026-10-27 05:05 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01518`. New distinct static failure-atomicity finding: R7 `ComposeSbs` can successfully clear original BackBuffer black and submit the LEFT SBS half before a checked RIGHT `DrawTextureHalf` fails; the code restores D3D9 states/RT/depth/viewport but does not restore original BackBuffer *pixels*. `PresentDest` marks the frame incomplete/mono fallback yet still forwards original `Present`; a successful Present may carry partially composed/black pixels. Physical-game reachability, Desktop Duplication host sampling, Quest3/VDXR outcome and FPS are UNTESTED. Different from 01511's unchecked compositor setter producing incorrectly accepted SBS active metadata; here failed half-draw is correctly rejected in metadata but backbuffer color rollback is absent.
- Source SSOT `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`: pinned `SOURCE_HEAD=27fd5162e15071dbf21b9b98d819bf33711de303`, docs-only `RESULT_SHA=649b045110f36b32aa567a779f225546f0a4dc94`. Exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01518.md` (+46/-0), commit marker exactly `[AUTO:CONVERSION-DX9EX-01518]`; remote HEAD exact, parent matches source HEAD, compare ahead=1 behind=0; remote Markdown blob `22b7cd8b4c87716a2910d6b3510a47ce4b707330` read back.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `PATCH_CANDIDATE_ONLY`; `RUNTIME_VALIDATION=UNTESTED`. No C++/HLSL/CMake/workflow/config changes or R84 promotion. Retry/readback/rollover +0.
- **AI 2 cumulative: previous GitHub SSOT 1992 + independent newly verified docs-only review +1 = 1993.** AI 1 remains 1666.


## AI 2 DX11 SM3 native indexed POINT-strip GPU windows 01095 (2026-10-27 04:58:50 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01095`; independent material gameplay-source development in `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`. Previous source HEAD `b489dca831c2a99760f9d92cb31ec1cae40ca147`. New substantive source implementation `a2e9843f50143d93ec74da9c9731958ccf021bfe`: already-native-layout genuine D3D9 programmable SM3 indexed TRIANGLESTRIP with D3DFILL_POINT is rendered as bounded original-IB indexed POINTLIST GPU windows without an oversized whole-triangle index expansion. All source indices are preflighted; global strip parity and each original repeated index corner are retained. Real live game vertex stream/VS/PS, guarded first-frame seed, DX9Ex Draw/input/FFB and frozen DXVK remain untouched.
- Same TASK_ID causal Gate repair commits: `cd659e89dd5338bc9516dfa21aa6eb5b6f861de5` (correct run-contract accepted path), `c67240b391a9830bf404a53f91de3687d17c0b63` (existing SM3 batch planner compatibility), `aa15884a3dcae428ec2c3d52cae06a58a48a80e4` (reuse audited native DrawIndexed submit callsite), `f40286cf304bde5d02e7116ead4ad09d11ae0a77` (preserve FVF negative mutation after new SM3 occurrence). Final **validation-bearing exact SHA** `f40286cf304bde5d02e7116ead4ad09d11ae0a77`. Genuine C++/GPU path was implemented, not a C6/docs-only achievement.
- GitHub push Actions at exactly that SHA: DX11 Fast Structural Checks `40389665855` completed/success; Backend Conversion Gate `40389666184` completed/success; Build `40389666094` completed/success; OpenXR VR architecture `40389666097` completed/success; OutRun EXE HUD Inspector CI `40389665816` completed/success. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`. Original OutRun game and Quest3/VDXR HMD pixels, full menu-to-race frame parity and FPS **not executed**: `RUNTIME_VALIDATION=UNTESTED`; no runtime PASS or feature-complete renderer assertion.
- **AI 2 score: previous confirmed 1991 + this single new verified source implementation +1 = cumulative 1992.** Same-task GitHub Gate repairs, retry, C6/checkpoint, readback and rollover earn +0. AI 1 remains 1666.

## AI 2 DX9Ex independent REVIEW_ONLY 01517 (2026-10-27 03:07:09 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01517`. Novel, independent static conditional finding: R7 `ExecuteStereoDraw` and `ClearDest` return early for offscreen RT0 without invalidating RIGHT depth/stencil synchronization; RT0-only restore also does not update synchronization. If an offscreen RT0 pass genuinely reuses and writes the SAME physical main-left depth/stencil surface (not a distinct surface) after a bilateral full clear, a subsequent backbuffer stereo Draw could accept `RightDepthSynchronized=true` despite stale RIGHT depth. Distinct from 01516 active occlusion-query LEFT main-RT bypass, 01513 cropped-viewport bootstrap, 01512 changed depth identity. Real original-game reachability, depth pixels, Quest3/VDXR and FPS UNTESTED.
- GitHub source SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, pinned `SOURCE_HEAD=c350c406109c5f8ebaf2e85e31d63cd346bf9691`, docs-only `RESULT_SHA=27fd5162e15071dbf21b9b98d819bf33711de303`. Exactly one added file `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01517.md` (+49/-0), commit message exact `[AUTO:CONVERSION-DX9EX-01517]`, branch HEAD exact, compare ahead=1/behind=0, remote blob SHA `0e7ec685bbd0b63fbbee149735ebcf959b7940a8`. No production source/C++/HLSL/CMake/workflow/config changes, merge, branch, package or release.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `RUNTIME_VALIDATION=UNTESTED`; `PATCH_CANDIDATE_ONLY`. No HMD pass claim. Same-task retry, rollover and status readback +0.
- **AI 2 score: previous confirmed 1990 + independent verified new docs-only review +1 = cumulative 1991.** AI 1 unchanged at 1666.

## AI 2 DX9Ex independent REVIEW_ONLY 01516 (2026-10-27 02:06 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01516`. New independent source-grounded conditional observation: R7 `ExecuteStereoDraw` skips `InvalidateRightDepthStencilIfLeftMayWrite` specifically when occlusion query is active (`!occlusionActive` guard), while forwarding LEFT-only original draw. If that draw writes main depth/stencil, retained right-sync TRUE is not a content proof; after query END, a later stereo depth-tested draw can be admitted against stale RIGHT depth. Actual exact game query-write ordering, Quest3/VDXR pixel outcome and FPS **UNTESTED**. Distinct from 01515 color-init viewport, 01514 tiled-depth Clear and 01513 bootstrap cropped-viewport predicates.
- GitHub SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, pinned `SOURCE_HEAD=4479f0c4e4079142e57d4e3a25e04ea06c0be6a2`, docs-only `RESULT_SHA=c350c406109c5f8ebaf2e85e31d63cd346bf9691`; exactly one newly added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01516.md` (+44/-0), commit message exact `[AUTO:CONVERSION-DX9EX-01516]`. Remote branch HEAD exact, parent matching SOURCE_HEAD, compare ahead=1 behind=0, blob SHA `e76384e4912bdc88d6ca19b6d300bf14a11cda52` readback verified. No source/config/workflow changes.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `RUNTIME_VALIDATION=UNTESTED`; `PATCH_CANDIDATE_ONLY`. Same-task retry/rollover/readback +0.
- **AI 2 score: previous confirmed 1989 + independently verified new docs-only review +1 = cumulative 1990.** AI 1 unchanged.

## AI 2 DX9Ex independent REVIEW_ONLY 01515 (2026-10-27 01:06 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01515`. Independent new source-grounded static conditional observation: R7 `EnsureStereoResources` allocates a full-size right-eye COLOR surface yet its first `Clear(Count=0,pRects=nullptr,TARGET)` runs in the **current saved possibly cropped viewport**. The later DirectGPU and SBS paths copy/sample the complete right surface; absent an intervening full-right color Clear/write, pixels outside the saved viewport are not proven initialized. This is color allocation/output coverage, distinct from 01513 depth/stencil bootstrap and 01514 tiled depth Clear predicate. Actual original-game cropped-first-allocation, visible artifact and Quest3/VDXR FPS **UNTESTED**.
- GitHub SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, pinned `SOURCE_HEAD=5178744eab87f36b6301f778c6e232790909aafc`, docs-only `RESULT_SHA=4479f0c4e4079142e57d4e3a25e04ea06c0be6a2`; exactly one new file `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01515.md` (+42/-0), commit message includes exact `[AUTO:CONVERSION-DX9EX-01515]`. Remote branch HEAD exact, compare ahead=1 behind=0, blob SHA `0d475413a48a9b8ab9f3e3d555e13d445c966cc2` readback verified. No game code, build/workflow/config, new branch, R84 promotion or risky B9200 +5 hook.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `SOURCE_BUILD_GATE=NOT_REQUIRED_DOCS_ONLY`; `BUILD=NOT_RUN`; `CI=NOT_RUN`; `RUNTIME_VALIDATION=UNTESTED`; `PATCH_CANDIDATE_ONLY`. Same task retry/rollover/status/readback +0.
- **AI 2 score: previous confirmed 1988 + one newly verified independent docs-only review +1 = cumulative 1989.** AI 1 unchanged.

## AI 2 DX9Ex independent REVIEW_ONLY 01514 (2026-10-27 00:06 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01514`. Unique source-grounded static finding: R7's `ClearCoversStereoBackbuffer` checks whether a single `D3DRECT` covers the full game viewport; multiple D3DRECTs whose **union** covers the full screen are not accepted as full clear. A successful bilateral depth/stencil Clear over a full-covering tiled array can therefore leave initial right-sync flags false and cause avoidable conservative rejection of a later eligible depth/stencil-tested stereo draw. Original-game Count>1 union-full occurrence, depth pixels, Quest3/VDXR and FPS remain UNTESTED.
- GitHub SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, SOURCE_HEAD `121741133f774e46322f046c9256537d3b6641f3`, docs-only RESULT_SHA `f1d60a37a53dbf158890e074d074cb548b88bbcb`; exactly one new `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01514.md` (+47/-0), exact `[AUTO:CONVERSION-DX9EX-01514]`, parent=SOURCE_HEAD, compare ahead=1/behind=0 and remote HEAD exact, remote Markdown blob `783c20f5b24eebe7e55a65046805d302146dced0` verified. Distinct from 01513's opposite cropped-viewport bootstrap false-positive; no game source, CI, workflow or configs changed.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`, `CODE_CHANGE=NO`, `RUNTIME_VALIDATION=UNTESTED`, `PATCH_CANDIDATE_ONLY`. R26+HUD baseline unchanged; no R84 or B9200 +5 risky hook. Same-task retries/readbacks/rollovers earn +0.
- **AI 2 score: previous confirmed 1987 + new independently verified docs-only review +1 = cumulative 1988.** AI 1 unchanged.

## AI 2 DX11 native triangle-list polygon GPU windows 01090 (2026-10-26 23:57 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01090`. Distinct actual game-source C++ implementation extends native shader-bound D3D9 SM3 indexed/nonindexed `TRIANGLELIST` POINT/WIREFRAME/SOLID Draw to multiple bounded D3D11 GPU VB windows. Authentic original source triangle corners, wide FLOAT4 shader attributes, original source IB full preflight and invalid late index rejection; original D3D9/DX9Ex rendering/gamepad/FFB/SkyGlow fallback preserved, DXVK frozen. No actual game/hardware pixels observed.
- OutRun source implementation SHA `919a5f358ecc9f9ed38cc29670546d95af99cd2c`; causal CI policy-record repair same TASK_ID and validation-bearing `RESULT_SHA=17df7418baa76c17fbb7c7466b1b2d5529a41754`. Exactly five mandatory GitHub Actions **push completed/success at that same SHA**: DX11 Fast Structural Checks `40342335642`, Backend Conversion Gate `40342335430`, Build `40342335580`, OpenXR VR architecture `40342335340`, OutRun EXE HUD Inspector CI `40342335728`.
- Separate C6 docs-only checkpoint `0cbaaf4b683a32b8036a46726b41dc4dc140a7f2` (`[skip ci]`) records evidence; it is NOT material result or independent score. `AUTOMATION_VALIDATION=PASS_EXACT_SHA` and `RUNTIME_VALIDATION=UNTESTED`. Game native Draw/frame counters, Quest 3/VDXR stereo, FPS and input runtime **UNTESTED**; do not claim full native playable renderer.
- **AI 2 cumulative: previous GitHub SSOT 1986 + one new completed material DX11 source achievement +1 = 1987.** CI repair, same task retries, C6 and readbacks +0. AI 1 remains 1666.


## AI 2 DX9Ex independent REVIEW_ONLY 01513 (2026-10-26 23:09 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01513`. New independent source-grounded conditional static finding: R7 `TryBootstrapRightDepthFromRecentClear` replays an old full-depth clear using `Clear(Count=0, nullptr)` under the **current possibly cropped viewport**, then promotes whole-surface right depth/stencil synchronized flags on success without verifying full viewport coverage. Microsoft's D3D9 API specifies that Count=0 clears the *viewport*, not necessarily the complete depth surface. This is distinct from 01512's compatible main-depth allocation identity/contents issue and 01511's SBS compositor HRESULT issue. An actual problematic game sequence is not proven.
- GitHub SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, analyzed `SOURCE_HEAD=aa174f4f19a77457b0045c8ffa7e997552d42d05`, docs-only result `RESULT_SHA=8767a87c18d32b9e00f95ad80ff077fee5de0b02`. Exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01513.md` (+50/-0), exact commit marker `[AUTO:CONVERSION-DX9EX-01513]`, compare ahead=1/behind=0, remote branch HEAD match and blob `312520ed0474162c4120828f44624ebb47cbeda7` verified. `CODE_CHANGE=NO`; source build/CI not run; R26+HUD baseline unchanged; Quest3/VDXR `RUNTIME_VALIDATION=UNTESTED`. Patch remains `PATCH_CANDIDATE_ONLY`.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; no claim of end-to-end runtime/HMD PASS. **AI 2 cumulative: previous confirmed 1985 + this unique new verified review achievement +1 = 1986.** Same TASK retry/check/rollover +0. AI 1 remains 1666.

## AI 2 DX11 native SM3 connected polygon strip 01089 (2026-10-26 22:55 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01089`. New cohesive real-game source implementation for programmable SM3 genuine D3D9 indexed and nonindexed `TRIANGLESTRIP` POINT/WIREFRAME/SOLID rendering across multiple bounded native D3D11 GPU windows. Per-source-triangle point occurrences, authentic alternating strip winding/overlap, bounded index-buffer and preflight on entire original indexed input; untouched original D3D9/DX9Ex rendering, input/FFB/SkyGlow fallback, and DXVK freeze.
- Game source implementation commit `c59adafe2e9a8446e626d5c7f99b52ac22afa606` (`src/vr/d3d11/live_game_frame_bridge.cpp`, `live_game_sm3_polygon_raster.hpp`, C++/Python regression); same TASK_ID causal gate/contract repair commits `4f5ef4d5848943ab7b91370b3320978cb8b3faec`, `87628eedf2f6351b738b0205d2a6a7eab51dad32`. Exact validation-bearing `RESULT_SHA=87628eedf2f6351b738b0205d2a6a7eab51dad32`. Separate C6 documentation-only checkpoint `845dbd39d850293d797a70680f3ced903c4ecdbf` with `[skip ci]` is not the material result and triggers no new Gate.
- All five GitHub Actions `push` runs `completed/success` with the identical exact `RESULT_SHA`: DX11 Fast Structural Checks `40332918794`, Backend Conversion Gate `40332918879`, Windows Build `40332918849`, OpenXR VR architecture `40332918730`, OutRun EXE HUD Inspector CI `40332918765`. Real OutRun game native pixels, Quest 3/VDXR stereo, actual drawn/published frame counts, runtime and FPS **UNTESTED**. Source/CI verified, not full playability or complete native gameplay.
- **AI 2 cumulative: previous confirmed 1984 + new integrated source achievement +1 = 1985.** Same TASK_ID gate repairs, C6, rechecks and retry/rollover contribute +0. AI 1 stays 1666.

## AI 2 DX11 live polygon fan native GPU windows 01088 (2026-10-26 22:10 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01088`. Distinct integrated source achievement: true game D3D9 shader-bound indexed/nonindexed TRIANGLEFAN SOLID/WIREFRAME/POINT fill across bounded native D3D11 DrawIndexed GPU windows with per-triangle point occurrences; original full-IB/fan seam bounds, opt-in and DX9Ex/input/FFB fallback retained. Not a test-only or bookkeeping result.
- Game repo `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`, source implementation SHA `3274ae647c787a4ffb51ab80a6c035c300879c8a`, exact validation-bearing `RESULT_SHA=66c2df85241d0cc852dbf8798205f8f3b667e94d`. Same-task contract/CI repair `d640e8def8849b88f0e56a3b3cd2c2e2c92cc9dd`, `1482013685f0bccf8c0b9a5c74966721d47930e1`, `66c2df85241d0cc852dbf8798205f8f3b667e94d`; these repairs, retries, and C6 are +0.
- Five required GitHub Actions `push` runs all `completed/success` on the identical SHA: DX11 Fast `40325716600`, Backend `40325716341`, Build `40325716494`, OpenXR `40325716578`, HUD `40325716522`. Fan C++ and Python regressions PASS; bundled host/x86 DLL/test launcher produced. Original game / Quest3 / VDXR / fps and actual native gameplay counters `RUNTIME_VALIDATION=UNTESTED`. No playable game or full renderer claim.
- **AI 2 score: previous confirmed 1983 + this one newly completed integrated source achievement +1 = cumulative 1984.** No double credit for the 01088 event E003/E004, CI repair, C6 or subsequent same-task restatements. AI 1 remains 1666.

## AI 2 DX9Ex independent REVIEW_ONLY 01512 (2026-10-26 22:06 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01512`. One distinct new source-grounded conditional finding: in R7 `SetDepthStencilSurfaceDest`, a changed main depth surface with the same descriptor as the existing right-eye depth passes compatibility and retains existing right depth/stencil synchronized flags without proving it is the previously synchronized logical left-main resource/content. If the original game binds a genuinely distinct main left-depth allocation with different contents and omits a subsequent fully mirrored depth clear, later depth-tested binocular draws may use a stale right depth. This does NOT assert the game performs this sequence or that Quest3 pixels are wrong. Separate from 01511 SBS setter HRESULT coverage, 01510 GOAL D3DX predrain queue attribution, and 01500-01503 R62 per-eye restore.
- GitHub SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, analyzed `SOURCE_HEAD=072d3e70bcfd2bb9c313779bf376a647a2987992`. Result `84b6e1d6d467bab5bdb8d8ef413ed82e6535ace9`, exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01512.md` (+46/-0); exact `[AUTO:CONVERSION-DX9EX-01512]`, result parent=source HEAD, GitHub compare ahead=1 behind=0, branch HEAD readback matched; reviewed Markdown blob `454c710a43329e4bb6685ed1a86f6697fd3b4a43` readback confirmed.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `CI=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. Only patch candidate documented. No C++/HLSL/CMake/workflow/runtime config change, no R84 promotion or dangerous B9200 post-CALL/+5 hook. R26+HUD baseline unchanged.
- **AI 2 score: previously confirmed 1982 + one new independently completed verified docs-only review +1 = cumulative 1983.** Same TASK retries, readback, rollover or status reports earn +0. AI 1 unchanged at 1666.

## AI 2 DX9Ex independent REVIEW_ONLY 01511 (2026-10-26 21:00 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01511`. One NEW, independent source-grounded static conditional finding: active R7 SBS fallback `ComposeSbs` discards HRESULTs from shader/FVF/render/texture-stage/sampler state setup after BeginScene. Both source L/R sprite and final DrawTextureHalf calls can be checked as successful while the compositing setup's own setter returns do not participate in the final success predicate. Conditional driver reachability and Quest3/HMD pixels UNTESTED. This is distinct from 01510 GOAL pre-drain tail origin, 01509 reference HUD scaling and 01500-01503 R62 per-eye/restore failure paths.
- Source SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, pinned `SOURCE_HEAD=28605bd4acbe4e246335ab172b3557ef7c1d2912`. Docs-only `RESULT_SHA=0b47cc10aca75f8c8c41692b0e0e31b50a9f947a`, exact one new `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01511.md` (+48/-0, no other file); marker `[AUTO:CONVERSION-DX9EX-01511]`; parent/base-to-result comparison ahead=1, behind=0; remote branch HEAD readback matched; blob `d510e13ffe157014a4314760ca30a2333b299c80` readback verified.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`, `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `CI=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. No C++/HLSL/CMake/workflow/runtime patch, no R84 promotion, no B9200 post-CALL/+5 hook; patch recommendation only, no live shader fault injection.
- **AI 2 score: previous confirmed 1981 + one newly completed independent docs-only review +1 = cumulative 1982.** Retries/readback/status reports of 01511 are +0. AI 1 remains 1666.

## AI 2 DX9Ex independent REVIEW_ONLY 01510 (2026-10-26 20:07:38 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01510`. One distinct static conditional finding: GOAL 0–99% inner E8 saves priority roots/tails/serial **before** old-owner native D3DX pre-drain. If pre-drain reentrantly appends an untagged node without `SelectSpriteQueueNode` / epoch increment, current GOAL admission may pass and final bounded tag walk may misattribute the *pre-source* node. Actual callback reentry, pixels, Quest3/HMD behavior UNTESTED. Not a repeat of 01506 VR admission (now guarded), 01507 full-parent queue pass or 01509 HUD containment.
- Source SSOT: `thp32tt/OutRun2006Tweaks@vr-d3d9ex-focus`, `SOURCE_HEAD=bda6b12078528265a8157d842a7c825883fb629c`. Review-only GitHub `RESULT_SHA=62db29a7bde1b95ea619411e41e20fc210a61bda`; **exact one** new `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01510.md` (+51, other paths 0), exact commit marker `[AUTO:CONVERSION-DX9EX-01510]`. Parent/SOURCE_HEAD same; remote HEAD readback same; compare ahead=1, behind=0; remote blob `1f87d53cbd72e5e1fc517bd1f704f7b7b81be0bc` verified.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`; `BUILD=NOT_RUN`; `RUNTIME_VALIDATION=UNTESTED`. No production source/hook/workflow change; R26+HUD baseline unchanged; no R84 promotion, no B9200 post-CALL/+5 hook. `PATCH_CANDIDATE_ONLY` documented, not implemented.
- **AI 2 score: previous confirmed 1980 + independently completed new docs-only static review +1 = cumulative 1981.** Existing TASK_ID retries, rechecks and this score update earn +0. AI 1 unchanged (1666).

## AI 2 DX11 indexed connected strip 01086 (2026-10-26 19:49:28 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01086`; **one new independent material C++ source implementation**, not a one-enum/test-only change. Retry, C6 and result readback are +0.
- Source SSOT: `thp32tt/OutRun2006Tweaks@vr-dx11-native-r71`; prior HEAD `b5fb3e2e556ad2224eb276a8c49e70bf629c7c6c`, material **RESULT_SHA `4f7331f01323c5b21e0a8cf5bd49313ddfafdf78`**, correct commit marker `[AUTO:CONVERSION-DX11-01086]` and no CI-skip. Exact single-parent branch compare ahead=1 behind=0 confirmed; five changed files only.
- New source integration: real shader-bound D3D9 indexed LINESTRIP/TRIANGLESTRIP with a shader-visible FLOAT4 packing overflow can expand original indexed source occurrences into bounded D3D11 GPU Draw windows. Adjacent windows repeat 1 line or 2 triangle seam entries, align triangle start to even original triangle ordinals to preserve winding, scan the entire IB before any native GPU mutation, and enforce source and total upload limits. Original game renderer/input/FFB fallback, default native opt-in and frozen DXVK preserved.
- C++ topology/attribute/winding/negative rejection tests `tools/dx11_sm3_indexed_connected_01086.cpp`, Python live source submission probe `tools/test_dx11_sm3_indexed_connected_01086.py` and Fast workflow integration.
- Required five **push exact-SHA** Actions completed/success on material RESULT_SHA: DX11 Fast `40308931748`, Backend Conversion `40308931793`, Windows Build `40308931642`, OpenXR `40308931713`, HUD Inspector `40308931698`. Additional isolated WARP `40308931696` success. `AUTOMATION_VALIDATION=PASS_EXACT_SHA`.
- `RUNTIME_VALIDATION=UNTESTED`. No physical OutRun menu/car/race render, native GPU draw counts, Quest3/VDXR frame images, input, FFB or FPS observations. Full native gameplay not claimed. Time allocation ratios not measured.
- **AI 2 score: previous 1979 + unique source outcome +1 = cumulative 1980.** AI 1 unchanged. The 01086 C6/checkpoint/CI readback contributes +0.

## AI 2 DX11 native indexed game source 01085 (2026-10-26 19:10:49 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01085`, one unique actual C++ source-implementation outcome, not a test/enum/metadata-only change. Retry, causal CI repairs and C6 state commits earn +0 additional.
- Target: `thp32tt/OutRun2006Tweaks` branch `vr-dx11-native-r71`; starting branch HEAD `d1dd30e80c67689ee9c5f17173ad7aad216d057c`. Actual renderer source implementation `f45b9ea3d817ea9ac7cfc6a8796f22edcba59a21`. Same-task CI causal repairs `d9f14df17caa666931a4e16f58ef23f1d60332e9`, `a19cf6e55a270da906913fcdc7672f877270fc5b`, `990fecfa5c2bab024453640be165ced9aa0748b3`, exact material result `74fe2239652250754cb0a8e470f7ea6ba6d5d41f`. All source/repair commits include exact `[AUTO:CONVERSION-DX11-01085]`; no CI-skip on material.
- New source capability: original game indexed programmable SM3 POINT/LINELIST/TRIANGLELIST source streams whose FLOAT4 D3D11 packing would exceed 32 MiB are collected in original D3D9 IB order into primitive-aligned bounded native GPU vertex windows and submitted through actual guarded D3D11 Draw; multi-stream attributes, repeated indices, fail-closed bounds, original D3D9/DX9Ex gameplay renderer/input/FFB fallback preserved. Added `tools/dx11_sm3_indexed_chunk_01085.cpp`, Python source graph probe and Fast CI integration.
- Confirmed prior 01084 recorded-policy mismatch repair and unchanged safety regression source-contract compatibility; changes belong to same 01085 work and have no separate score.
- Five mandatory **push exact-SHA** GitHub Actions all `completed/success` on `74fe2239652250754cb0a8e470f7ea6ba6d5d41f`: DX11 Fast `40302596414`, Backend Conversion `40302596447` (run attempt 2), Windows Build `40302596382`, OpenXR `40302596461`, HUD Inspector `40302596395`. No disabling negative regression or bypassing required Gate.
- `AUTOMATION_VALIDATION=PASS_EXACT_SHA`; `RUNTIME_VALIDATION=UNTESTED`. No physical OutRun menu/car/race execution, native frame capture, Quest3/VDXR L/R game visuals, input or FPS measurement; playable full-native DX11 not claimed. Development time proportions were not measured.
- **AI 2 score: previous confirmed 1977 + one independently verified DX11 source outcome +1 = cumulative 1978.** AI 1 unchanged unless separately updated by its owner. 01085 same TASK retry/CI repair/C6/checkpoint/readback never score again.

## AI 2 DX9Ex independent REVIEW_ONLY 01509 (2026-10-26 19:11:15 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01509`; unique R26+HUD source-grounded review of effective gameplay HUD 1920x1080 reference containment scaling with changing actual game-backbuffer aspect. Separate from 01508 GOAL rebuilt-root queue provenance and 01490 cached MENU projection. No game source change.
- Pinned analyzed GitHub SOURCE_HEAD `456642108a4c0bd86c337bc14ead561b3c376cdc`. Concurrent, unrelated docs-only research commit `ca807408ecd8337a968baf4e62f983cb2ac1feea` landed before this docs-only write; source between pinned HEAD and actual parent was unchanged. Actual parent `ca807408ecd8337a968baf4e62f983cb2ac1feea`.
- Durable DX9Ex result `2a84d617d90ce47e6cb27b5324620abe67f04634`, exact single added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01509.md` (+46), exact `[AUTO:CONVERSION-DX9EX-01509]`; remote HEAD readback and commit-parent compare ahead=1/behind=0, blob `c6172b81a0413b711f661faa5d92c01ecc27fe32` verified.
- Finding: conditional with `VRHud1080pReference=ON`, `R30HudContainScale` multiplies user HUD scale 0.55 by `ContainedScale` derived from live D3D9 backbuffer aspect. Source-equivalent arithmetic: 3440x1440 -> effective 0.4093023256; 2496x2688 -> 0.55; 1920x1080 -> 0.55. No claim of actual optical size jump; setting, game executable/DLL/host identity, L/R physical draw, native presentation and HMD behavior unverified. R84/R33 opt-in GPU profiler explicitly rejected as default-R26 finding after checking CMake.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. R26+HUD baseline `0cff83cf509c2acd6f3391b3a46c4dec1403a0d9` unchanged; result HUD candidate is not HMD PASS. No R84 promotion, B9200 unsafe hook, or source patch.
- **AI 2 score: previous confirmed 1978 + new unique completed review +1 = cumulative 1979.** Same TASK_ID retry/rollover/readback +0. AI 1 score unchanged.

## AI 2 DX11 native SM3 fan GPU chunks 01084 (2026-10-26 17:55:30 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01084` (one distinct source implementation accomplishment); retry E002 and CI-specific repairs are the SAME task, +0 additional.
- Target: `thp32tt/OutRun2006Tweaks` / `vr-dx11-native-r71`. Source parent `80f2478376553f2866c85b45b7281bcf44f0b6ca`, new C++/regression material commit `5d7f7b6c77c0b8c489339cb922e9cd2884206771`, confirmed causal build/backend/fast acceptance repair and validation-bearing final SHA `00e6879a67471cc5e628a7328240c3394a2a30b8`. Exact `[AUTO:CONVERSION-DX11-01084]` in both messages, no CI skip on result.
- Integrated source: live intercepted nonindexed programmable game SM3 D3D9 TRIANGLEFAN streams that exceed 32 MiB FLOAT4 native upload are partitioned into bounded center-preserving/rim-overlap windows, reassembled from original declaration bytes, translated to native D3D11 triangle-list index chunks and executed via guarded per-window `DrawIndexed`. Maintains original winding, complete per-draw admission and fail-closed native publication, D3D9Ex rendering/input/FFB fallback; other indexed/instanced/point/wire paths unchanged. C++ positive/negative geometry/attribute probe plus static native consumer regression executed. Initial Windows Build/Backend/DX11 Fast CI failed a stale 7-Draw/2-stream-helper source-contract count, repaired without removing negative authorization checks.
- All mandatory **push exact-SHA** GitHub Actions `completed/success` on `00e6879a67471cc5e628a7328240c3394a2a30b8`: DX11 Fast `40294308962`, Backend Conversion `40294308987`, Windows Build `40294308973`, OpenXR `40294308888`, HUD Inspector `40294308975`. No unchanged-SHA duplicate execution.
- `AUTOMATION_VALIDATION=PASS_EXACT_SHA`; `RUNTIME_VALIDATION=UNTESTED`. Game launch, real native frame pixels/counts, full menu->car->race continuity, input behavior, Quest3/VDXR stereo, FPS and gameplay PASS are not claimed. Source-phase time fractions not measured.
- **AI 2 score: previous confirmed 1976 + newly verified unique DX11 source outcome +1 = cumulative 1977.** AI 1 remains 1666. All further retries/rollovers/C6/readback for this TASK_ID are +0.

## AI 2 DX9Ex independent REVIEW_ONLY 01508 (2026-10-26 17:06:51 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01508` (one new independent analysis event). Focus: GOAL full-parent current-root exception **false-negative** when a previously empty priority-list root sentinel is detached during root replacement. 01507 instead examined a possible intervening queue pass, 01506 inner E8 VR toggles, and 01504 obsolete +TIME foreign false-positive; no repeated-score event.
- Pinned GitHub SOURCE_HEAD `thp32tt/OutRun2006Tweaks@436a1cced6c4db479535e0e477ed34cb7eb270f8` (`vr-d3d9ex-focus`). Source-equivalent bounded-helper fixture: after old empty root O is detached and new root N contains only new graph G, `FirstVerifiedAppendedNode(N,O,G)` returns null rather than G; unchanged-root sentinel and retained-old-tail controls return G. Natural original-game occurrence **UNTESTED**. The fail-closed guard is intentional; this is a conditional semantic-coverage review, not a proven screen defect.
- Durable result commit `616787e6564f89400dda5bb6f227c6368b62343b`, exactly one `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01508.md` file (+53 lines), no other path; exact `[AUTO:CONVERSION-DX9EX-01508]`, remote HEAD and commit parent exact, compare ahead=1 behind=0, remote blob `0afb027514cc70ca1b3889c1934fc813cff9f58e` verified.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`, `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. No new REA/Quest3/OpenXR/exact GPU trace or measured FPS; R26+HUD baseline unchanged, no R84 promotion or B9200 post-CALL/+5 hook.
- **AI 2 score: previous confirmed 1975 + unique completed review +1 = cumulative 1976.** AI 1 unchanged (1666). Recheck/retry/rollover for this TASK_ID: +0.

## AI 2 DX9Ex independent REVIEW_ONLY 01507 (2026-10-26 16:07:14 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01507`; new independent static conditional analysis of **full GOAL graph parent** tag-publication timing across possible intervening original partial queue consumption. This is different from 01506 inner result-progress E8 VR-mode admission and 01504 +TIME root replacement. One completed, uniquely documented review +1; retry/readback/rollover +0. AI 1 unchanged.
- GitHub pinned SOURCE_HEAD `thp32tt/OutRun2006Tweaks@0a32d1e5bada498bada7b2e4b6b79a7285263e5e` branch `vr-d3d9ex-focus`. The installed two full graph callsite replacements enter only when VREnabled+STATE_GOAL+outside queue, then publish new finite ResultProgress SpriteNode tags **after** original(0x979E0) returns, without queue-epoch/earlier-physical-consumption proof. Queue serial cutoff can prevent retroactive ownership within an ongoing pass, but does not establish whether an earlier pass selected that node while the source wrapper was still active. Reentry and real HMD issue remain unobserved.
- Durable docs-only commit `2c9d0243231e702df331e1a91c2b14d4ea37fac8`: exactly one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01507.md` (+49; other files 0), exact `[AUTO:CONVERSION-DX9EX-01507]`. Remote HEAD/result SHA, parent/source HEAD, compare ahead=1 behind=0, remote blob `7f3a40cc1074472e0e8fb481bdfbe2c4217a87d2` verified.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`; no new REA or original-game runtime trace, Quest3, XR frame or FPS proof. R26+HUD stays baseline; R84 not promoted, B9200 unsafe +5 hook not reintroduced.
- **AI 2 score: previous confirmed 1974 + unique completed review +1 = cumulative 1975.**

## AI 2 DX9Ex independent REVIEW_ONLY 01506 (2026-10-26 15:11:26 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01506`. One independent new source-confirmed conditional finding: installed GOAL 0–99% inner E8 source publishes exact queued ScreenHud/ResultProgress tag at leave without verifying VR mode at entry/leave. Distinct from prior 01505 +TIME deferred D3DX batch; retries and readbacks earn +0. AI 1 score unchanged.
- GitHub SOURCE_HEAD `thp32tt/OutRun2006Tweaks@0270bcfa9a8617a0a565138dea5a91b8070c36bb` branch `vr-d3d9ex-focus`. Installed `ResultProgressEnter` only promotes direct semantic when VR enabled; paired `ResultProgressLeave` unconditionally queues tags on stable-root newly appended children. The old `ResultTextEnter/Leave` B9200 return-site midhooks are NOT installed, and were not the finding.
- Docs-only source result commit `0a32d1e5bada498bada7b2e4b6b79a7285263e5e`; parent exact SOURCE_HEAD; one newly added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01506.md` (+51, no other path), exact `[AUTO:CONVERSION-DX9EX-01506]`, verified remote HEAD, compare ahead=1 behind=0, remote blob `029d6ca252847063a9a0711d524d30c0144a8c3c`.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. No new REA/run/GPU frame/HMD performance proof; R26+HUD baseline unchanged and no R84 or unsafe B9200 +5 hook.
- **AI 2 score: previous 1973 + unique completed review +1 = cumulative 1974.**

## AI 2 DX9Ex independent REVIEW_ONLY 01505 (2026-10-26 14:09:57 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01505`; new independent static conditional source finding on a rejected +TIME E8 source ticket versus a still-homogeneous direct D3DX command ledger, **+1 once**; retry, identical result readback and future rollover score +0. AI 1 unchanged.
- Pinned GitHub SOURCE_HEAD `thp32tt/OutRun2006Tweaks@5bcc74104f775cc69ac6dd313601a9ff46e2e84a` (`vr-d3d9ex-focus`). Earlier 01504 current-root queued interposition was separately reverted to stable-root-only by a USER-DX9EX-VISUAL-REPAIR commit before this task; 01505 independently concerns deferred native direct +TIME D3DX ownership after `StageExtensionAdmission.mayPublish` rejects changed VR/queue epoch.
- Durable one-file docs-only commit `f5fdfd0afd8a4747bcc48433eddc5c66240bd258` for `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01505.md` (+53 lines, no other file), exact `[AUTO:CONVERSION-DX9EX-01505]` marker, parent/source HEAD match, remote head verified, compare ahead=1 behind=0, remote blob `d88e4a2a8a7417c0c76332a49c06e798f25b4c67` verified.
- Finding: E8 departure that rejects VR or queue-epoch ticket skips source-exit D3DX Flush but does not revoke an already-recorded exact direct StageExtensionTime homogeneous batch. Native delayed Flush/End separately restores ScreenHud/StageExtensionTime if its own live sprite/ledger guards still hold. The user-visible effect, physical bilateral draw, and natural occurrence are NOT established; conditional source review only.
- `AUTOMATION_VALIDATION=PASS_DOCS_ONLY_EXACT_SHA`; `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`. R26+HUD original baseline unchanged; R84 not promoted; no Quest3/OpenXR PASS claim.
- **AI 2 score: previous confirmed 1972 + one newly completed unique review +1 = cumulative 1973.**

## AI 2 DX11 native connected real-game geometry 01083 (2026-10-26 13:53:28 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01083`. New material native SM3 connected LINESTRIP/TRIANGLESTRIP cross-upload source path, source + regression tests integrated, **+1 once** after all required Gates. Subsequent retries, gate readbacks and C6 bookkeeping are +0. AI 1 unchanged.
- Repository: `thp32tt/OutRun2006Tweaks` branch `vr-dx11-native-r71`. Base `ba185aaf9b36a1295514a745080a2fe140d2dacd`; initial source+test material commit `34658b9be8204ef5374c94215b2e416150e8a2fa`; validation-bearing exact SHA `0b92706497098316a49f24b10e0c84d6a0725f4d` with same `[AUTO:CONVERSION-DX11-01083]` tag. The second commit repaired confirmed prior 01082 C6 policy record mismatch, not a new feature.
- Actual change: `live_game_frame_bridge.cpp` plus SM3 assembly header route long nonindexed game-authored LINESTRIP/TRIANGLESTRIP geometry through bounded D3D11 multi-stream FLOAT4 source window uploads, with one/two repeated strip-seam vertices and even TRIANGLESTRIP starting parity. Per-chunk native IA/VS/PS GPU Draw and original FFB/input/DX9Ex fallback preserved. Indexed, fan, point/wireframe, malformed and over-budget inputs remain fail-closed. Dedicated C++ positive/negative strip parity/source-window probe and live-bridge wiring regression integrated into DX11 Fast.
- Five **push exact-SHA** mandatory GitHub Actions verified `completed/success` for `0b92706497098316a49f24b10e0c84d6a0725f4d`: DX11 Fast `40270195582`, Backend Conversion `40270195691`, Windows Build `40270195651`, OpenXR `40270195626`, HUD Inspector `40270195604`. No CI-skip, force push or duplicate unchanged-SHA retry.
- `AUTOMATION_VALIDATION=PASS_EXACT_SHA`; `RUNTIME_VALIDATION=UNTESTED`. Actual game launch, full menu/car/race native frame, HMD output, published frame count, Quest 3/VDXR stereo and 72/120 FPS unobserved. Source time proportion not measured; no claimed implementation percentage.
- **AI2 score: previous confirmed 1971 + one independently verified source accomplishment +1 = cumulative 1972.** No additional credit for C6/bookkeeping. AI 1 remains 1666.

## AI 2 DX11 native shader-bound game GPU draw source implementation 01082 (2026-10-26 13:02:39 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX11-01082`; one new integrated source milestone, **+1 once**; further retries/C6/readback are +0. AI 1 unchanged.
- Repository: `thp32tt/OutRun2006Tweaks` branch `vr-dx11-native-r71`; base HEAD `2a36ff69e030a9ffa84ec97cae22d2d0541b8813`; C++ material source SHA `3dfb1ae419cad7649682be63edebe3021fd06676`; validation-bearing fix SHA `f8868b5fa0600fa77f8828a6d8685d06747c251e` (exact `[AUTO:CONVERSION-DX11-01082]` tags). Source and regression material code changed, not a mere review.
- Actual native SM3 game Draw bridge now splits game-authored noninstanced unindexed point/line/triangle LIST streams exceeding a single 32 MiB packed FLOAT4 GPU upload into aligned chunks, assembles absolute multi-stream vertex windows, streams through live D3D11 IA + guarded Draw; retains indexed/connected fallback and original D3D9Ex input/FFB. No game/HMD runtime observation.
- Mandatory five **push, exact-SHA** GitHub Actions SUCCESS all for `f8868b5fa0600fa77f8828a6d8685d06747c251e`: DX11 Fast `40265391734`, Backend `40265391755`, Build `40265391703`, OpenXR `40265391717`, HUD `40265391738`. Initial exact-string static failures were repaired within the same task; no CI-skip/forced push.
- `AUTOMATION_VALIDATION=PASS_EXACT_SHA`; `RUNTIME_VALIDATION=UNTESTED`, game/HMD/Quest3 and native full menu/car/race frame not proven. C6 bookkeeping is not another scored event.
- **AI 2 score: previous confirmed 1970 + new implemented and five-gate verified source milestone +1 = cumulative 1971.**

## AI 2 DX9Ex independent REVIEW_ONLY 01503 (2026-10-26 12:07:22 KST (Asia/Seoul))

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01503`; independent R26-safe inner RIGHT render-target/depth/viewport restore failure AFTER two successful physical eye draws, distinct from 01502 pre-right private projection setter, 01500 outer projection restore and 01497 optional particle stream cleanup. Unique verified static conditional finding +1; retry/readback earns +0.
- Pinned GitHub SOURCE_HEAD: `thp32tt/OutRun2006Tweaks@330b8b3c6a0714d6753dcca19110da365a82c6d3` (`vr-d3d9ex-focus`); R26-safe R30 returns LEFT S_OK while both physical draws have run and right RT/depth/viewport restore fails, counters record pair, `NoteRestoreFailure` poisons R7 Present. R84 comparison has a different caller-HRESULT policy; no R84 promotion.
- Durable docs-only commit `9add83cf17eb73e42538f8f15f137ff0cffa8752`; one added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01503.md` (+55, other files zero); exact `[AUTO:CONVERSION-DX9EX-01503]`; parent/source HEAD match; remote branch HEAD match; compare ahead=1 behind=0; remote blob `605d4cc00847a1129cd0d5469424bfb819dbf7be` verified.
- `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`; no new REA, GPU trace or Quest3 HMD PASS. AI 1 left unchanged.
- **AI 2 score: previous confirmed 1969 + new unique completed review +1 = cumulative 1970.**

## AI 2 DX9Ex independent REVIEW_ONLY 01502 (2026-10-26 11:07:07 KST (Asia/Seoul))

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01502`; unique source-confirmed conditional R26-safe fixed-function RIGHT projection setter failure after LEFT physical Draw, +1. This task's retries/rollovers/readbacks earn +0.
- GitHub pinned SOURCE_HEAD `thp32tt/OutRun2006Tweaks@a9d137577e5527aa4adf43b412d586de999070a2` (`vr-d3d9ex-focus`). Distinct from 01501 LEFT zero-draw and 01500 original projection restore: RIGHT SetTransform fails before native RIGHT raw Draw, yet R26-safe R30 counts a duplicated pair and returns LEFT success, flags RightDrawFailed and vetoes stereo Present. Not an observed Quest3 occurrence.
- Durable docs-only commit `96cb784a35ad4e5efe16a4a8309942bbf399b897`; one newly added `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01502.md` (+53, no other files), exact `[AUTO:CONVERSION-DX9EX-01502]`; source parent, remote HEAD, compare ahead=1 behind=0, remote blob `ef65b838b7fb246f8c8de28c3ff02dacd91511a9` confirmed.
- `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`; AI 1 unchanged. R26+HUD baseline unchanged and R84 not promoted.
- **AI 2 score: previous confirmed 1968 + unique completed review +1 = cumulative 1969.**

## AI 2 DX9Ex independent REVIEW_ONLY 01501 (2026-10-26 10:06 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01501`; new independent conditional static finding, +1; retries, readbacks and rollover of this same result score +0.
- Pinned source SSOT `thp32tt/OutRun2006Tweaks@5109bf374b71d97b59d6973d9a9bbd034f596ef9` (`vr-d3d9ex-focus`). R62 FVF142 original game fixed-function sprite LEFT `SetTransform(PROJECTION)` can fail before native raw GPU LEFT draw (attempt=0); R30 nevertheless accounts missing mono backup, classifies `StereoFailureLeftDrawFailed`, and terminal E_FAIL precludes original lower GPU draw. Frame Present fails closed; a source-conditional failure, not Quest3/HMD-observed.
- GitHub docs-only result: `a6e755bfb10fb714d8cfdcafbd74684cc1558b09`; one new `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01501.md` (+53, no other path) with exact `[AUTO:CONVERSION-DX9EX-01501]`; verified remote HEAD and parent SOURCE_HEAD, compare ahead=1/behind=0, remote blob `bc5e0dba95acf615e232a438f05ddfdc0d8b25ce`.
- `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`, R26+HUD reference unchanged and R84 not promoted; AI 1 unchanged at 1666.
- **AI 2 score: previous confirmed 1967 + new completed review +1 = cumulative 1968.**

## AI 2 DX9Ex independent REVIEW_ONLY 01500 (2026-10-26 09:08 KST)

- TASK_ID / RUN_KEY: `CONVERSION-DX9EX-01500`; one new independent conditional static finding, +1, not a HMD pass or code repair. Same TASK_ID retries / rollover / re-verification +0.
- Pinned source SSOT `thp32tt/OutRun2006Tweaks@b16d6994a6492947e721d607a4ff1710b0e7dfe3` (`vr-d3d9ex-focus`). R62 fixed-function FVF142 after both raw eye draws and inner RT/depth/viewport restore succeed: if final original projection `SetTransform` fails, exact finite +TIME/GOAL result converts successful native draw HRESULT to E_FAIL, but admitted non-result projected-rank/ScreenHud retains successful left HRESULT. Both call NoteRestoreFailure and poison same-frame stereo Present; no observed runtime failure or optical PASS.
- GitHub docs-only result: `7e317009303c7592080d41d543216c0a6fd8321b`, path `docs/reviews/dx9ex/automation/CONVERSION-DX9EX-01500.md`, 47 added lines, commit tag `[AUTO:CONVERSION-DX9EX-01500]`. Verified branch HEAD equals commit, parent equals source HEAD, compare ahead=1/behind=0 and only a single added review file. Remote readback blob SHA `8b226de710cbb515114bfbae635038ce32119bed`.
- `CODE_CHANGE=NO`, `BUILD=NOT_RUN`, `RUNTIME_VALIDATION=UNTESTED`; R26+HUD baseline and no R84 auto-promotion/B9200 hook changes. AI 1 unchanged at 1666.
- **AI 2 score: previous confirmed 1966 + unique completed review +1 = cumulative 1967.**

## AI 2 수도권 시즌권·연간권 특가 모니터링 (2026-10-26 08:50 KST)

- KST execution: 2026-10-26 08:50:32 KST (Asia/Seoul); AI: **AI 2 — ChatGPT2**; RUN_KEY: `AUTO:CAPITAL-ANNUAL-PASS:20261026T085032+0900`.
- Previous confirmed cumulative score: **1965**. Change: **+1** (new daily monitoring execution completed with source verification under user-specific monitoring-scoring rule). New confirmed cumulative score: **1966**.
- Result: Searched newly released/reopened weekend-eligible annual/season/multi-visit passes across Seoul, Gyeonggi and Incheon amusement parks, aquariums, water parks and kids facilities. **No independently confirmed new/reopened materially recommendable offer beyond previously notified conditions**. Do not send duplicate purchase alert.
- SEA LIFE COEX official 2026 39%-off single pass remains **KRW 79,000** versus **KRW 130,000**, official 2026-09-23 to 2026-10-31 promotion, weekend/holiday eligible, first-entry-month one-year subject to purchase-month-specific registration/validity. Previously alerted; official channel MyRealTrip 10/24–10/26 (platform offer redirected to home when checked, so no platform live inventory claim). Prior sale-platform notice of registration/first visit by 10/31 remains a buyer-specific caution; official general terms and platform-specific special terms should not be conflated.
- Other checks: Seoul Land 5-month season-pass registration page found, but no verified newly active promotional sales; Aqua Planet Ilsan official annual-pass general-price page (weekend KRW 100,000), Lotte World official annual-pass standard pricing, Everland existing KB card discount, One Mount and Woongjin Playdoci local listings; none independently proved a new user-qualifying promotion. No invented prices, blackout dates, infant or registration terms.
- Sources: https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/y26-ap-single-flash-sale/ ; https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/annual-pass/ ; https://www.visitsealife.com/coex-seoul/tickets-passes/book-tickets/promotions/annual-pass-promotion/ ; https://onestop.seoulland.co.kr/m/season/seasonTicket/5SEASON ; https://www.aquaplanet.co.kr/ilsan/eng/information/use_price.do ; https://adventure.lotteworld.com/price/member/price ; https://grp.everland.com/pick/2025/garden_pass/notice/notice-260316.html .
- AI 1 unchanged. Calculation: **1965 + 1 = 1966**. Same RUN_KEY/retry/readback scores +0.


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
