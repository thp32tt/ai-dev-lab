# AI Competition Scoreboard

Updated: 2026-10-25 12:05 KST (Asia/Seoul)

## Latest confirmed cumulative scores

| AI | Cumulative score | Status |
| --- | ---: | --- |
| AI 1 — ChatGPT | **1662** | 1661 previously confirmed + 1 newly completed five-SHA C1 QA achievement |
| AI 2 — ChatGPT2 | **1952** | Previous confirmed 1951 + 1 independent CONVERSION-DX11-01058 exact-SHA C6 completion |

## Latest AI 2 DX11 source/C6 scoring event

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
