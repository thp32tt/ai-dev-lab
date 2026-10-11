# OutRun conversion controller: exact-SHA C6 terminal guard

## Observed incident (2026-10-12 KST)

CONVERSION-DX11-00553 had successful exact-SHA GitHub Actions at
76bdb15ead9209cf0532c64142642b853915fa66 (Backend Conversion Gate
38153838352, DX11 Fast, Win32 Release, OpenXR and HUD). The Portainer
controller continued to manage the same task while the branch run record
had not yet been sealed with COMPLETE_BUILD_VERIFIED / C6_STATE /
PASS_EXACT_SHA. The [skip ci] bookkeeping commit
bea76495da713fa385cf67d651c204069d481c0d is now present; the live
controller reported 00553 DONE/PASS at 01:15:44 KST.

An older controller inspection copy accepts only single-word PASS/COMPLETE
stage values. That copy is NOT verified to match the currently running
container source. The parser mismatch is therefore a plausible additional
failure mode, not a confirmed sole root cause.

## Deployment integration (not automatically active)

1. Import conversion_c6_guard.py into the running Portainer controller.
2. Before any conversion dispatch, rollover, repair or retry: fetch the
   exact TASK_ID JSON record and CI result for validation_bearing_result_sha.
   Never substitute current branch HEAD after a [skip ci] bookkeeping commit.
3. Atomically persist idempotency_key in durable queue state BEFORE issuing
   one C6-only message. Retain it across restart, rollover and retry.
4. Route decisions: DONE -> release task/lease and stop; SEND_C6_ONCE ->
   bookkeeping only; WAIT_C6 -> poll GitHub and alert on timeout, NEVER resend;
   WAIT_CI -> poll exact SHA, do not restart CI merely for missing C6;
   WAIT_GITHUB -> retry fetch without mutation; BLOCKED -> escalate mismatch.
5. Seal by GitHub Contents API CAS using the existing blob SHA, changing only
   C6/run-record metadata and committing with [skip ci]. Preserve
   material_result_sha, feature_contract, acceptance_results, HMD UNTESTED.
6. Already complete GitHub C6 record overrides stale WAIT_ACTIONS queue phase.
   A C6 bookkeeping task never earns a second AI score.
7. Run: python -m unittest -v test_conversion_c6_guard.py (seven tests).

WARNING: GitHub storage does not update the running Portainer image. The
running controller must be patched, restarted, and its version/queue checked
before claiming operational recurrence prevention.
