import unittest

from ops_brain import proposals_from_response


class ProposalValidationTests(unittest.TestCase):
    def setUp(self):
        self.note = "Someone from Design will check the banner."
        self.task = {
            "task_id": "banner",
            "title": "Check the banner",
            "owner": None,
            "due_date": "2026-12-08",
            "depends_on": [],
            "source_excerpt": self.note,
            "review_notes": [],
        }

    def validate(self):
        return proposals_from_response({"tasks": [self.task]}, self.note, "launch_storefront")

    def test_unassigned_owner_is_flagged_with_evidence(self):
        (proposal,) = self.validate()
        self.assertIsNone(proposal.owner)
        self.assertTrue(proposal.needs_review)
        self.assertEqual(proposal.source_excerpt, self.note)
        self.assertIn("Owner needs confirmation.", proposal.review_notes)

    def test_invalid_date_is_rejected(self):
        self.task["due_date"] = "2026-02-30"
        with self.assertRaisesRegex(ValueError, "invalid due date"):
            self.validate()

    def test_unknown_dependency_is_rejected(self):
        self.task["depends_on"] = ["missing"]
        with self.assertRaisesRegex(ValueError, "Unknown dependency IDs: missing"):
            self.validate()

    def test_cycle_is_rejected(self):
        self.task["depends_on"] = ["banner"]
        with self.assertRaisesRegex(ValueError, "Dependency cycle: banner -> banner"):
            self.validate()

    def test_invented_evidence_is_rejected(self):
        self.task["source_excerpt"] = "Asha agreed to check the banner."
        with self.assertRaisesRegex(ValueError, "excerpt absent"):
            self.validate()


if __name__ == "__main__":
    unittest.main()
