import unittest
from conversion_c6_guard import decide, is_c6_terminal, seal_record

SHA = "76bdb15ead9209cf0532c64142642b853915fa66"
TASK = "CONVERSION-DX11-00553"
CI = {"head_sha": SHA, "status": "completed", "conclusion": "success"}
ORIGINAL = {
    "task_id": TASK, "status": "SOURCE_IMPLEMENTED_CI_PENDING",
    "checkpoint": "C4_COMMIT", "hmd_test_performed": False,
    "material_result_sha": "different-earlier-material-sha",
    "feature_contract": {"keep": [1, 2]},
    "acceptance_results": ["positive", "negative"],
    "pipeline": {"C5_PACKAGE": "NOT_REQUIRED"},
}

class C6GuardTests(unittest.TestCase):
    def test_exact_ci_success_sends_once(self):
        d = decide(task_id=TASK, sha=SHA, record=ORIGINAL, ci=CI, c6_dispatch_keys=set())
        self.assertEqual(d.action, "SEND_C6_ONCE")
        self.assertEqual(decide(task_id=TASK, sha=SHA, record=ORIGINAL, ci=CI,
                                c6_dispatch_keys={d.idempotency_key}).action, "WAIT_C6")

    def test_exact_ci_gate_not_neighbor(self):
        self.assertEqual(decide(task_id=TASK, sha=SHA, record=ORIGINAL,
                                ci={**CI, "head_sha":"wrong"}, c6_dispatch_keys=set()).action, "WAIT_CI")
        self.assertEqual(decide(task_id=TASK, sha=SHA, record=ORIGINAL,
                                ci={**CI, "conclusion":"failure"}, c6_dispatch_keys=set()).action, "WAIT_CI")

    def test_protect_git_unavailable(self):
        self.assertEqual(decide(task_id=TASK, sha=SHA, record=None, ci=CI,
                                c6_dispatch_keys=set(), github_read_ok=False).action, "WAIT_GITHUB")

    def test_preserve_contract_and_material_sha(self):
        sealed = seal_record(ORIGINAL, TASK, SHA)
        self.assertEqual(sealed["material_result_sha"], ORIGINAL["material_result_sha"])
        self.assertEqual(sealed["feature_contract"], ORIGINAL["feature_contract"])
        self.assertEqual(sealed["acceptance_results"], ORIGINAL["acceptance_results"])
        self.assertEqual(sealed["pipeline"]["C5_PACKAGE"], "NOT_REQUIRED")
        self.assertEqual(sealed["runtime_validation"], "UNTESTED")
        self.assertTrue(is_c6_terminal(sealed, TASK, SHA))
        self.assertEqual(decide(task_id=TASK, sha=SHA, record=sealed,
                                ci=CI, c6_dispatch_keys=set()).action, "DONE")

    def test_idempotent_seal(self):
        s = seal_record(ORIGINAL, TASK, SHA)
        self.assertEqual(seal_record(s, TASK, SHA), s)

    def test_refuse_other_sha(self):
        with self.assertRaises(ValueError):
            seal_record({**ORIGINAL, "validation_bearing_result_sha":"other"}, TASK, SHA)
        self.assertEqual(decide(task_id=TASK, sha=SHA,
                                record={**ORIGINAL, "validation_bearing_result_sha":"other"},
                                ci=CI, c6_dispatch_keys=set()).action, "BLOCKED")

    def test_existing_00553_record_is_done(self):
        real = {**ORIGINAL, "status":"COMPLETE_BUILD_VERIFIED", "checkpoint":"C6_STATE",
                "automation_validation":"PASS_EXACT_SHA", "validation_bearing_result_sha":SHA,
                "state_persisted":True, "runtime_validation":"UNTESTED"}
        self.assertEqual(decide(task_id=TASK, sha=SHA, record=real,
                                ci=CI, c6_dispatch_keys=set()).action, "DONE")

if __name__ == "__main__": unittest.main()
