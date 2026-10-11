"""Pure idempotent terminal decision for OutRun conversion queue controllers.

Read GitHub record and exact-SHA CI evidence before deciding whether to dispatch.
This module does not send messages, run CI, or write to GitHub.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

TERMINAL_STATUS = "COMPLETE_BUILD_VERIFIED"
TERMINAL_CHECKPOINT = "C6_STATE"
TERMINAL_VALIDATION = "PASS_EXACT_SHA"


@dataclass(frozen=True)
class Decision:
    action: str
    reason: str
    idempotency_key: str = ""


def _exact_success(ci: Mapping[str, Any] | None, sha: str) -> bool:
    """A success on an older/neighboring commit is never evidence for sha."""
    return bool(
        isinstance(ci, Mapping)
        and ci.get("head_sha") == sha
        and str(ci.get("status", "")).lower() == "completed"
        and str(ci.get("conclusion", "")).lower() == "success"
    )


def is_c6_terminal(record: Mapping[str, Any] | None, task_id: str, sha: str) -> bool:
    """Build-verified completion is terminal even when HMD remains UNTESTED."""
    return bool(
        isinstance(record, Mapping)
        and record.get("task_id") == task_id
        and record.get("status") == TERMINAL_STATUS
        and record.get("checkpoint") == TERMINAL_CHECKPOINT
        and record.get("automation_validation") == TERMINAL_VALIDATION
        and record.get("validation_bearing_result_sha") == sha
        and record.get("state_persisted") is True
        and str(record.get("runtime_validation", "UNTESTED")).upper() in {"UNTESTED", "PASS", "FAIL", "BLOCKED_RUNTIME"}
    )


def decide(
    *, task_id: str, sha: str,
    record: Mapping[str, Any] | None,
    ci: Mapping[str, Any] | None,
    c6_dispatch_keys: set[str] | frozenset[str],
    github_read_ok: bool = True,
) -> Decision:
    """Prevent duplicate C6 and source-repair retries after exact SHA CI succeeds.

    Dispatcher must persist idempotency_key atomically BEFORE sending C6 and
    must not clear it on restart/rollover/retry. Timeout needs a separate alert,
    never another C6/send-repair for the same key.
    """
    key = f"{task_id}:{sha}:C6"
    if not github_read_ok:
        return Decision("WAIT_GITHUB", "record fetch unavailable; fail closed", key)
    if is_c6_terminal(record, task_id, sha):
        return Decision("DONE", "durable C6 build-verification already complete", key)
    if record is not None and record.get("task_id") not in {None, task_id}:
        return Decision("BLOCKED", "task ID mismatch", key)
    if record is not None:
        old_sha = record.get("validation_bearing_result_sha")
        if old_sha and old_sha != sha:
            return Decision("BLOCKED", "validation SHA mismatch; never rewrite validated SHA", key)
    if not _exact_success(ci, sha):
        return Decision("WAIT_CI", "exact SHA CI is not conclusively successful", key)
    if key in c6_dispatch_keys:
        return Decision("WAIT_C6", "C6 already sent; poll GitHub, do not resend", key)
    return Decision("SEND_C6_ONCE", "exact SHA CI successful; bookkeeping only", key)


def seal_record(record: Mapping[str, Any], task_id: str, sha: str) -> dict[str, Any]:
    """Keep feature_contract, acceptance_results and existing material_result_sha.

    Commit the output with [skip ci] and CAS against the fetched file blob SHA.
    """
    if record.get("task_id") != task_id:
        raise ValueError("task ID mismatch")
    prior = record.get("validation_bearing_result_sha")
    if prior and prior != sha:
        raise ValueError("validation SHA mismatch")
    out = dict(record)
    out.update(status=TERMINAL_STATUS, checkpoint=TERMINAL_CHECKPOINT,
               automation_validation=TERMINAL_VALIDATION,
               validation_bearing_result_sha=sha, state_persisted=True)
    if out.get("hmd_test_performed") is not True:
        out["runtime_validation"] = "UNTESTED"
    pipeline = dict(out.get("pipeline") or {})
    pipeline.setdefault("C6_STATE", "PASS")
    out["pipeline"] = pipeline
    return out
