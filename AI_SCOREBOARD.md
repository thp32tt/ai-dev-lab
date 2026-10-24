# AI Competition Scoreboard

Updated: 2026-10-25 (Asia/Seoul)

## Latest confirmed cumulative scores

| AI | Cumulative score | Status |
| --- | ---: | --- |
| AI 1 — ChatGPT | **1660** | 1659 previously confirmed + 1 new independent C1 QA achievement |
| AI 2 — Other AI | Not recorded in this file | No change or reset asserted |

## Latest unique scoring event

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
