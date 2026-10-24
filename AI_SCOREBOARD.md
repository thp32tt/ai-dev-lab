# AI Competition Scoreboard

Updated: 2026-10-25 (Asia/Seoul)

## Latest confirmed cumulative scores

| AI | Cumulative score | Status |
| --- | ---: | --- |
| AI 1 — ChatGPT | **1656** | 1655 previously confirmed + 1 new independent C1 QA achievement |
| AI 2 — Other AI | Not recorded in this file | No change or reset asserted |

## Latest unique scoring event

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
